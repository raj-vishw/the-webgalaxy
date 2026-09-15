import { universeAffinities } from '../data/recommendations'
import { relationships as relationshipData } from '../data/relationships'
import { universes } from '../data/universes'
import { websites } from '../data/websites'
import type { RelationshipType, UniverseDefinition, WebsiteDefinition, WebsiteRelationship } from '../types/galaxy'
import { importanceFor } from '../utils/celestial'

/**
 * Relationship service — the only place that reads the raw relationship
 * dataset. It merges inline (`website.relationships`) and shared
 * (`data/relationships.ts`) declarations, validates them, mirrors the
 * symmetrical ones and answers questions like "what is related to X?".
 *
 * Everything here is deterministic and synchronous; a future backend can
 * replace the `build()` step without changing the query functions' shapes.
 *
 * Conceptual rule: a relationship connects two independent websites. Nothing
 * in this service orders, nests or ranks them.
 */

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'related',
  'alternative',
  'integration',
  'ecosystem',
  'complementary',
  'competitor',
  'same-company',
]

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  related: 'Related',
  alternative: 'Alternative',
  integration: 'Works with',
  ecosystem: 'Same ecosystem',
  complementary: 'Complements',
  competitor: 'Competitor',
  'same-company': 'Same company',
}

/** Display priority when only a few connections can be shown. */
const TYPE_PRIORITY: Record<RelationshipType, number> = {
  integration: 7,
  alternative: 6,
  related: 5,
  complementary: 4,
  ecosystem: 3,
  'same-company': 2,
  competitor: 1,
}

/** A relationship resolved from one website's point of view. */
export interface ResolvedRelationship {
  /** The website at the other end. */
  website: WebsiteDefinition
  type: RelationshipType
  directed: boolean
  /** For directed relationships: does the connection flow away from the viewpoint? */
  outgoing: boolean
  note?: string
  /** Canonical source/target as declared, for drawing. */
  sourceId: string
  targetId: string
}

export interface RelationshipIssue {
  relationship: WebsiteRelationship
  reason: 'unknown-source' | 'unknown-target' | 'self' | 'duplicate' | 'unknown-type'
}

export interface ValidationResult {
  valid: WebsiteRelationship[]
  issues: RelationshipIssue[]
}

const websiteById = new Map(websites.map((w) => [w.id, w]))
const universeById = new Map(universes.map((u) => [u.id, u]))

/** Key that treats symmetrical relationships as one, whichever way they were declared. */
function keyOf(r: WebsiteRelationship): string {
  if (r.directed) return `${r.source}>${r.target}:${r.type}`
  const [a, b] = r.source < r.target ? [r.source, r.target] : [r.target, r.source]
  return `${a}~${b}:${r.type}`
}

/**
 * Drops anything that would corrupt the graph: unknown ids, self links,
 * unknown types and duplicates. Pure — safe to run on backend payloads.
 */
export function validateRelationships(input: WebsiteRelationship[], knownIds: Set<string>): ValidationResult {
  const valid: WebsiteRelationship[] = []
  const issues: RelationshipIssue[] = []
  const seen = new Set<string>()
  for (const relationship of input) {
    const { source, target, type } = relationship
    if (!RELATIONSHIP_TYPES.includes(type)) issues.push({ relationship, reason: 'unknown-type' })
    else if (!knownIds.has(source)) issues.push({ relationship, reason: 'unknown-source' })
    else if (!knownIds.has(target)) issues.push({ relationship, reason: 'unknown-target' })
    else if (source === target) issues.push({ relationship, reason: 'self' })
    else {
      const key = keyOf(relationship)
      if (seen.has(key)) issues.push({ relationship, reason: 'duplicate' })
      else {
        seen.add(key)
        valid.push(relationship)
      }
    }
  }
  return { valid, issues }
}

function collectDeclared(): WebsiteRelationship[] {
  const inline: WebsiteRelationship[] = []
  for (const website of websites) {
    for (const ref of website.relationships ?? []) inline.push({ source: website.id, ...ref })
  }
  return [...inline, ...relationshipData]
}

/** Adjacency: website id → relationships seen from that website. */
const graph = new Map<string, ResolvedRelationship[]>()
let validation: ValidationResult = { valid: [], issues: [] }

function build() {
  graph.clear()
  validation = validateRelationships(collectDeclared(), new Set(websiteById.keys()))
  const add = (from: string, to: string, r: WebsiteRelationship, outgoing: boolean) => {
    const website = websiteById.get(to)
    if (!website) return
    const list = graph.get(from) ?? []
    list.push({ website, type: r.type, directed: !!r.directed, outgoing, note: r.note, sourceId: r.source, targetId: r.target })
    graph.set(from, list)
  }
  for (const r of validation.valid) {
    add(r.source, r.target, r, true)
    // Symmetrical relationships are visible from both ends; directed ones
    // still appear at the receiving end, just marked as incoming.
    add(r.target, r.source, r, false)
  }
  if (import.meta.env.DEV && validation.issues.length) {
    console.warn(
      `[webgalaxy] ${validation.issues.length} relationship(s) ignored:`,
      validation.issues.map((i) => `${i.relationship.source} → ${i.relationship.target} (${i.reason})`).join(', '),
    )
  }
}

build()

function rank(a: ResolvedRelationship, b: ResolvedRelationship): number {
  return (
    TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type] ||
    importanceFor(b.website) - importanceFor(a.website) ||
    a.website.name.localeCompare(b.website.name)
  )
}

/** Every valid relationship of a website, most relevant first. */
export function getRelationships(websiteId: string): ResolvedRelationship[] {
  return [...(graph.get(websiteId) ?? [])].sort(rank)
}

export function getRelationshipsOfType(websiteId: string, types: RelationshipType[]): ResolvedRelationship[] {
  return getRelationships(websiteId).filter((r) => types.includes(r.type))
}

/**
 * Everything connected to a website, whatever the type of connection. When
 * a limit applies, the selection is diversified: the strongest of each type
 * first (an alternative, an integration, a related site…), then the rest —
 * so a crowded website still shows the range of its connections.
 */
export function getRelatedWebsites(websiteId: string, limit = Infinity): ResolvedRelationship[] {
  const all = getRelationships(websiteId)
  if (all.length <= limit) return all
  const byType = new Map<RelationshipType, ResolvedRelationship[]>()
  for (const r of all) byType.set(r.type, [...(byType.get(r.type) ?? []), r])
  const types = [...byType.keys()].sort((a, b) => TYPE_PRIORITY[b] - TYPE_PRIORITY[a])
  const out: ResolvedRelationship[] = []
  while (out.length < limit) {
    let added = false
    for (const type of types) {
      const next = byType.get(type)?.shift()
      if (!next) continue
      out.push(next)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
  }
  return out
}

/** Only websites the data explicitly declares as alternatives. */
export function getAlternatives(websiteId: string): ResolvedRelationship[] {
  return getRelationshipsOfType(websiteId, ['alternative'])
}

/** Websites the data says are commonly used together with this one. */
export function getIntegrations(websiteId: string): ResolvedRelationship[] {
  return getRelationshipsOfType(websiteId, ['integration', 'complementary'])
}

/** The explicit relationship between two websites, if any (either direction). */
export function getRelationshipBetween(a: string, b: string): ResolvedRelationship | null {
  return graph.get(a)?.find((r) => r.website.id === b) ?? null
}

/** Whether a website has at least one relationship of the given kinds. */
export function hasRelationships(websiteId: string, types?: RelationshipType[]): boolean {
  const list = graph.get(websiteId)
  if (!list?.length) return false
  return types ? list.some((r) => types.includes(r.type)) : true
}

/** Universes with an affinity to the given one, with the reason. */
export function getRelatedUniverses(universeId: string): { universe: UniverseDefinition; reason: string }[] {
  const out: { universe: UniverseDefinition; reason: string }[] = []
  for (const affinity of universeAffinities) {
    const [a, b] = affinity.universeIds
    const other = a === universeId ? b : b === universeId ? a : null
    if (!other) continue
    const universe = universeById.get(other)
    if (universe && universe.id !== universeId) out.push({ universe, reason: affinity.reason })
  }
  return out
}

export function areUniversesRelated(a: string, b: string): boolean {
  return universeAffinities.some(({ universeIds: [x, y] }) => (x === a && y === b) || (x === b && y === a))
}

/** Validation report for the loaded dataset (dev tooling, tests). */
export function getRelationshipValidation(): ValidationResult {
  return validation
}

/** Number of valid relationships in the graph (each counted once). */
export function relationshipCount(): number {
  return validation.valid.length
}
