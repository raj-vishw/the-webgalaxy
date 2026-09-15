import { RELATIONSHIP_WEIGHT, SIGNAL_MAX } from '../data/recommendations'
import { getCatalog } from '../store/catalogStore'
import type { RelationshipType, UniverseDefinition, WebsiteDefinition, WebsiteTrend } from '../types/galaxy'
import { importanceFor } from '../utils/celestial'
import { isDiscoverable } from '../utils/discovery'
import { tokenize } from '../utils/search'
import {
  areUniversesRelated,
  getRelatedUniverses,
  getRelationshipBetween,
  type ResolvedRelationship,
} from './relationshipService'

/**
 * Recommendation service — deterministic, explainable scoring over the local
 * dataset. No learning, no network: the same context always yields the same
 * suggestions, and every suggestion can say why it appeared.
 *
 * The scorer is intentionally a plain sum of bounded signals (see
 * `SIGNAL_MAX`) normalised to 0–1, so it is easy to read, tune, or swap for a
 * backend/AI service that returns the same `Recommendation` shape.
 */

/** One step of the user's exploration during this session. */
export interface ExplorationEntry {
  kind: 'website' | 'universe'
  id: string
  /** Epoch milliseconds. */
  at: number
}

/** Lightweight in-session signals. Never leaves the browser. */
export interface SessionSignals {
  universeVisits: Record<string, number>
  websiteViews: Record<string, number>
  /** Tags of viewed websites and matched search terms, weighted by recurrence. */
  tagWeights: Record<string, number>
  /** Most recent search queries (bounded). */
  searches: string[]
  /** Number of discovery actions taken. */
  discoveries: number
}

export interface RecommendationContext {
  currentWebsiteId: string | null
  currentUniverseId: string | null
  history: ExplorationEntry[]
  signals: SessionSignals
}

export interface Recommendation {
  website: WebsiteDefinition
  /** 0–1. */
  score: number
  /** Short explanations, most significant first. */
  reasons: string[]
  /** The explicit relationship to the current website, when there is one. */
  relationship?: ResolvedRelationship
}

const MAX_SEARCHES = 12

/** Lookups over the catalogue's current data (rebuilt when it changes). */
interface Index {
  websites: WebsiteDefinition[]
  websiteById: Map<string, WebsiteDefinition>
  universeById: Map<string, UniverseDefinition>
  allTags: Set<string>
}
let index: Index | null = null
function catalogIndex(): Index {
  const { websites, universes } = getCatalog()
  if (index && index.websites === websites && index.universeById.size === universes.length) return index
  index = {
    websites,
    websiteById: new Map(websites.map((w) => [w.id, w])),
    universeById: new Map(universes.map((u) => [u.id, u])),
    allTags: new Set(websites.flatMap((w) => w.tags ?? [])),
  }
  return index
}

export const emptySignals = (): SessionSignals => ({
  universeVisits: {},
  websiteViews: {},
  tagWeights: {},
  searches: [],
  discoveries: 0,
})

// ─── Signal recording (pure: returns updated copies) ───────────────────────

const bump = (record: Record<string, number>, key: string, by = 1) => ({ ...record, [key]: (record[key] ?? 0) + by })

export function recordUniverseVisit(signals: SessionSignals, universeId: string): SessionSignals {
  return { ...signals, universeVisits: bump(signals.universeVisits, universeId) }
}

export function recordWebsiteView(signals: SessionSignals, website: WebsiteDefinition): SessionSignals {
  let tagWeights = signals.tagWeights
  for (const tag of website.tags ?? []) tagWeights = bump(tagWeights, tag)
  return { ...signals, websiteViews: bump(signals.websiteViews, website.id), tagWeights }
}

export function recordSearch(signals: SessionSignals, query: string): SessionSignals {
  const q = query.trim()
  if (!q) return signals
  let tagWeights = signals.tagWeights
  // Search terms that name a tag count as interest in that tag.
  for (const token of tokenize(q)) if (catalogIndex().allTags.has(token)) tagWeights = bump(tagWeights, token, 0.5)
  return { ...signals, searches: [...signals.searches.filter((s) => s !== q), q].slice(-MAX_SEARCHES), tagWeights }
}

export function recordDiscovery(signals: SessionSignals): SessionSignals {
  return { ...signals, discoveries: signals.discoveries + 1 }
}

// ─── Trends ────────────────────────────────────────────────────────────────

/** Trend snapshot of a website, from the catalogue record (static or admin-controlled — never live). */
export function getTrend(websiteId: string): WebsiteTrend | undefined {
  const w = catalogIndex().websiteById.get(websiteId)
  if (!w || (!w.isTrending && !w.isEmerging && !w.trendingScore)) return undefined
  return { websiteId, trendingScore: w.trendingScore ?? 0, trendDirection: w.trendDirection ?? 'steady', emerging: w.isEmerging, asOf: '' }
}

export function isTrending(websiteId: string): boolean {
  return !!catalogIndex().websiteById.get(websiteId)?.isTrending
}

export function isEmerging(websiteId: string): boolean {
  return !!catalogIndex().websiteById.get(websiteId)?.isEmerging
}

const byTrendScore = (a: WebsiteDefinition, b: WebsiteDefinition) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0) || a.name.localeCompare(b.name)

/** Trending websites (static / admin-controlled data), strongest first. */
export function getTrendingWebsites(limit = 6): WebsiteDefinition[] {
  return catalogIndex()
    .websites.filter((w) => w.isTrending)
    .sort(byTrendScore)
    .slice(0, limit)
}

/** Emerging websites: lower prominence, high discovery potential. */
export function getEmergingWebsites(limit = 6): WebsiteDefinition[] {
  return catalogIndex()
    .websites.filter((w) => w.isEmerging)
    .sort(byTrendScore)
    .slice(0, limit)
}

// ─── Scoring ───────────────────────────────────────────────────────────────

export const RELATION_PHRASE: Record<RelationshipType, (name: string) => string> = {
  related: (n) => `Related to ${n}`,
  alternative: (n) => `Alternative to ${n}`,
  integration: (n) => `Works with ${n}`,
  ecosystem: (n) => `Same ecosystem as ${n}`,
  complementary: (n) => `Complements ${n}`,
  competitor: (n) => `Competes with ${n}`,
  'same-company': (n) => `Same company as ${n}`,
}

interface Signal {
  key: keyof typeof SIGNAL_MAX
  value: number
  reason?: string
}

/** Weighted tag profile of the current context: what the explorer seems to care about. */
function tagProfile(current: WebsiteDefinition | undefined, signals: SessionSignals): Map<string, number> {
  const profile = new Map<string, number>()
  for (const tag of current?.tags ?? []) profile.set(tag, 1)
  for (const [tag, weight] of Object.entries(signals.tagWeights)) {
    profile.set(tag, (profile.get(tag) ?? 0) + Math.min(weight, 2) * 0.25)
  }
  return profile
}

function tagSimilarity(candidate: WebsiteDefinition, profile: Map<string, number>): { value: number; shared: string[] } {
  const tags = candidate.tags ?? []
  if (!tags.length || !profile.size) return { value: 0, shared: [] }
  let overlap = 0
  const shared: string[] = []
  for (const tag of tags) {
    const w = profile.get(tag)
    if (w) {
      overlap += w
      shared.push(tag)
    }
  }
  let total = 0
  for (const w of profile.values()) total += w
  const value = Math.min(1, overlap / Math.sqrt(total * tags.length))
  return { value, shared: shared.sort((a, b) => (profile.get(b) ?? 0) - (profile.get(a) ?? 0)) }
}

/** Score one candidate for the given context. Exposed for tests and tuning. */
export function scoreWebsite(candidate: WebsiteDefinition, ctx: RecommendationContext): Recommendation {
  const { websiteById, universeById } = catalogIndex()
  const current = ctx.currentWebsiteId ? websiteById.get(ctx.currentWebsiteId) : undefined
  const currentUniverseId = ctx.currentUniverseId ?? current?.universeId ?? null
  const universe = universeById.get(candidate.universeId)
  const signals: Signal[] = []

  // Explicit relationship with the current website.
  const relationship = current ? getRelationshipBetween(current.id, candidate.id) : null
  if (relationship) {
    signals.push({
      key: 'relationship',
      value: RELATIONSHIP_WEIGHT[relationship.type],
      reason: RELATION_PHRASE[relationship.type](current!.name),
    })
  }

  // Relationships with websites explored earlier this session, decaying with age.
  let historyValue = 0
  let historyReason: string | undefined
  const visited = ctx.history.filter((e) => e.kind === 'website' && e.id !== current?.id).slice(-6).reverse()
  visited.forEach((entry, index) => {
    const r = getRelationshipBetween(entry.id, candidate.id)
    if (!r) return
    const weight = Math.pow(0.6, index) * SIGNAL_MAX.historyRelationship
    if (weight > historyValue) {
      historyValue = weight
      historyReason = RELATION_PHRASE[r.type](websiteById.get(entry.id)?.name ?? entry.id)
    }
  })
  if (historyValue > 0) signals.push({ key: 'historyRelationship', value: historyValue, reason: historyReason })

  // Shared interests.
  const tags = tagSimilarity(candidate, tagProfile(current, ctx.signals))
  if (tags.value > 0) {
    signals.push({
      key: 'tags',
      value: tags.value * SIGNAL_MAX.tags,
      reason: `Shares ${tags.shared.slice(0, 2).join(', ')}`,
    })
  }

  // Universe affinity: same region, or a region that pairs with it.
  if (currentUniverseId && universe) {
    if (candidate.universeId === currentUniverseId) {
      signals.push({ key: 'universe', value: SIGNAL_MAX.universe * 0.8, reason: `Also in ${universe.name}` })
    } else if (areUniversesRelated(candidate.universeId, currentUniverseId)) {
      const from = universeById.get(currentUniverseId)
      signals.push({ key: 'universe', value: SIGNAL_MAX.universe * 0.5, reason: `${universe.name} pairs with ${from?.name ?? 'here'}` })
    }
  }

  // Session personalisation: regions the explorer keeps returning to.
  const visits = ctx.signals.universeVisits[candidate.universeId] ?? 0
  if (visits >= 2 && universe) {
    signals.push({
      key: 'session',
      value: Math.min(1, visits / 4) * SIGNAL_MAX.session,
      reason: `You keep exploring ${universe.name}`,
    })
  }

  // Prominence and type.
  const importance = importanceFor(candidate)
  signals.push({ key: 'popularity', value: importance * SIGNAL_MAX.popularity, reason: universe ? `Popular in ${universe.name}` : undefined })
  if (current && candidate.objectType === current.objectType) signals.push({ key: 'objectType', value: SIGNAL_MAX.objectType })

  // Static / admin-controlled trend snapshot.
  if (candidate.isTrending || candidate.isEmerging || candidate.trendingScore) {
    signals.push({
      key: 'trending',
      value: (candidate.trendingScore ?? 0) * SIGNAL_MAX.trending,
      reason: candidate.isEmerging ? 'Emerging' : candidate.isTrending ? 'Trending now' : undefined,
    })
  }

  let raw = signals.reduce((sum, s) => sum + s.value, 0)
  // Recently explored websites step back so suggestions keep moving forward.
  const views = ctx.signals.websiteViews[candidate.id] ?? 0
  if (views > 0) raw *= views >= 2 ? 0.35 : 0.55

  const ceiling = Object.values(SIGNAL_MAX).reduce((a, b) => a + b, 0)
  const reasons = signals
    .filter((s) => s.reason && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s) => s.reason!)
  return {
    website: candidate,
    score: Math.min(1, raw / ceiling),
    reasons: reasons.length ? reasons.slice(0, 2) : ['Worth a detour'],
    relationship: relationship ?? undefined,
  }
}

const byScore = (a: Recommendation, b: Recommendation) =>
  b.score - a.score || a.website.name.localeCompare(b.website.name)

/**
 * "You may also explore": the best next destinations for the current
 * context. Candidates must be complete entries; the current website and
 * anything named in `exclude` are never suggested.
 */
export function getRecommendations(ctx: RecommendationContext, limit = 4, exclude: Iterable<string> = []): Recommendation[] {
  const skip = new Set(exclude)
  if (ctx.currentWebsiteId) skip.add(ctx.currentWebsiteId)
  return catalogIndex()
    .websites.filter((w) => !skip.has(w.id) && isDiscoverable(w))
    .map((w) => scoreWebsite(w, ctx))
    .filter((r) => r.score > 0.05)
    .sort(byScore)
    .slice(0, limit)
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'your', 'from', 'that', 'this', 'online', 'platform', 'free'])
const keywordsOf = (w: WebsiteDefinition) => new Set(tokenize(w.description ?? '').filter((t) => t.length >= 4 && !STOP_WORDS.has(t)))

/**
 * Websites similar to one website — universe, tags, relationship type,
 * object type, prominence and description keywords — independent of the
 * session so "Explore Similar" means the same thing for everyone.
 */
export function getSimilarWebsites(websiteId: string, limit = 5): Recommendation[] {
  const { websiteById, websites } = catalogIndex()
  const source = websiteById.get(websiteId)
  if (!source) return []
  const ctx: RecommendationContext = {
    currentWebsiteId: websiteId,
    currentUniverseId: source.universeId,
    history: [],
    signals: emptySignals(),
  }
  const sourceKeywords = keywordsOf(source)
  const sourceImportance = importanceFor(source)
  return websites
    .filter((w) => w.id !== websiteId && isDiscoverable(w))
    .map((w) => {
      const base = scoreWebsite(w, ctx)
      let bonus = 0
      const reasons = [...base.reasons]
      // Description keywords in common and comparable prominence nudge similarity.
      const shared = [...keywordsOf(w)].filter((k) => sourceKeywords.has(k))
      if (shared.length) {
        bonus += Math.min(0.08, shared.length * 0.03)
        reasons.push(`Both about ${shared[0]}`)
      }
      bonus += (1 - Math.abs(importanceFor(w) - sourceImportance)) * 0.03
      // Competitors and same-company links are weak evidence of similarity.
      if (base.relationship && (base.relationship.type === 'competitor' || base.relationship.type === 'same-company')) bonus -= 0.05
      return { ...base, score: Math.min(1, base.score + bonus), reasons: reasons.slice(0, 2) }
    })
    .filter((r) => r.score > 0.12)
    .sort(byScore)
    .slice(0, limit)
}

/** Universes worth a look from the current one, most relevant to the session first. */
export function getRecommendedUniverses(ctx: RecommendationContext, limit = 3): { universe: UniverseDefinition; reason: string }[] {
  const universeId = ctx.currentUniverseId
  if (!universeId) return []
  return getRelatedUniverses(universeId)
    .sort((a, b) => (ctx.signals.universeVisits[b.universe.id] ?? 0) - (ctx.signals.universeVisits[a.universe.id] ?? 0))
    .slice(0, limit)
}
