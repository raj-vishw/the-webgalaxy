import type { UniverseDefinition, WebsiteDefinition } from '../types/galaxy'
import { importanceFor } from './celestial'
import { matchesFilters, type FilterContext, type WebsiteFilters } from './filtering'

export interface WebsiteMatch {
  kind: 'website'
  website: WebsiteDefinition
  universe: UniverseDefinition | undefined
  score: number
  /** Why an indirect result (related / alternative) appears. */
  reason?: string
}

export interface UniverseMatch {
  kind: 'universe'
  universe: UniverseDefinition
  score: number
}

export type SearchMatch = WebsiteMatch | UniverseMatch

export interface SearchResults {
  websites: WebsiteMatch[]
  universes: UniverseMatch[]
}

const SCORE = {
  nameExact: 100,
  nameStarts: 80,
  nameContains: 60,
  universeName: 40,
  tagExact: 32,
  tagPartial: 20,
  description: 10,
} as const

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()

export function tokenize(query: string): string[] {
  return normalize(query).split(/[\s,]+/).filter(Boolean)
}

/** Relevance of one website for one token, or 0 if the token matches nothing. */
function scoreToken(token: string, website: WebsiteDefinition, universe: UniverseDefinition | undefined, fullQuery: string): number {
  const name = normalize(website.name)
  let best = 0
  if (name === fullQuery) best = Math.max(best, SCORE.nameExact)
  if (name.startsWith(token)) best = Math.max(best, SCORE.nameStarts)
  else if (name.includes(token)) best = Math.max(best, SCORE.nameContains)
  if (universe && normalize(universe.name).includes(token)) best = Math.max(best, SCORE.universeName)
  for (const tag of website.tags ?? []) {
    const t = normalize(tag)
    if (t === token) best = Math.max(best, SCORE.tagExact)
    else if (t.includes(token)) best = Math.max(best, SCORE.tagPartial)
  }
  if (website.description && normalize(website.description).includes(token)) best = Math.max(best, SCORE.description)
  return best
}

/**
 * Lightweight local ranking. Every token must match somewhere (AND); the
 * result score sums the best field match per token, then prominence breaks
 * ties so well-known sites surface first among equals.
 */
export function searchGalaxy(
  query: string,
  websites: WebsiteDefinition[],
  universes: UniverseDefinition[],
  filters?: WebsiteFilters,
  limit = 12,
  filterContext?: FilterContext,
): SearchResults {
  const tokens = tokenize(query)
  if (tokens.length === 0) return { websites: [], universes: [] }
  const fullQuery = normalize(query)
  const universeById = new Map(universes.map((u) => [u.id, u]))

  const websiteMatches: WebsiteMatch[] = []
  for (const website of websites) {
    if (filters && !matchesFilters(website, filters, filterContext)) continue
    const universe = universeById.get(website.universeId)
    let score = 0
    let complete = true
    for (const token of tokens) {
      const s = scoreToken(token, website, universe, fullQuery)
      if (s === 0) {
        complete = false
        break
      }
      score += s
    }
    if (complete) websiteMatches.push({ kind: 'website', website, universe, score: score + importanceFor(website) * 5 })
  }
  websiteMatches.sort((a, b) => b.score - a.score || a.website.name.localeCompare(b.website.name))

  const universeMatches: UniverseMatch[] = []
  for (const universe of universes) {
    if (filters?.universeId && universe.id !== filters.universeId) continue
    const name = normalize(universe.name)
    const description = normalize(universe.description)
    let score = 0
    for (const token of tokens) {
      if (name === token) score += SCORE.nameExact
      else if (name.startsWith(token)) score += SCORE.nameStarts
      else if (name.includes(token)) score += SCORE.nameContains
      else if (description.includes(token)) score += SCORE.description
      else {
        score = 0
        break
      }
    }
    if (score > 0) universeMatches.push({ kind: 'universe', universe, score })
  }
  universeMatches.sort((a, b) => b.score - a.score)

  return { websites: websiteMatches.slice(0, limit), universes: universeMatches.slice(0, 4) }
}
