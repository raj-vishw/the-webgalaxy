import type { AppContext } from '../context.js'
import { universeRepo } from '../repositories/universeRepo.js'
import { websiteRepo, type WebsiteRecord } from '../repositories/websiteRepo.js'
import { toPublicUniverse, type PublicUniverse } from './universeService.js'
import { toLight, type PublicWebsiteLight } from './websiteService.js'

export interface SearchHit {
  website: PublicWebsiteLight
  score: number
  /** Which field matched best, for the UI's caption. */
  matched: 'name' | 'universe' | 'tag' | 'description'
}

export interface SearchResponse {
  query: string
  websites: SearchHit[]
  universes: (PublicUniverse & { score: number })[]
}

const SCORE = { nameExact: 100, nameStarts: 80, nameContains: 60, universeName: 40, tagExact: 32, tagPartial: 20, description: 10 } as const

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()
export const tokenize = (query: string) => normalize(query).split(/[\s,]+/).filter(Boolean)

function scoreToken(token: string, w: WebsiteRecord, fullQuery: string): { score: number; matched: SearchHit['matched'] } {
  const name = normalize(w.name)
  let best = 0
  let matched: SearchHit['matched'] = 'name'
  const consider = (score: number, field: SearchHit['matched']) => {
    if (score > best) {
      best = score
      matched = field
    }
  }
  if (name === fullQuery) consider(SCORE.nameExact, 'name')
  if (name.startsWith(token)) consider(SCORE.nameStarts, 'name')
  else if (name.includes(token)) consider(SCORE.nameContains, 'name')
  if (normalize(w.universeName).includes(token)) consider(SCORE.universeName, 'universe')
  for (const tag of w.tags) {
    if (tag === token) consider(SCORE.tagExact, 'tag')
    else if (tag.includes(token)) consider(SCORE.tagPartial, 'tag')
  }
  if (normalize(w.description).includes(token)) consider(SCORE.description, 'description')
  return { score: best, matched }
}

/**
 * The Phase 4 ranking, now over database candidates: the database narrows
 * with ILIKE across name / description / universe / tags, then every token
 * must match (AND) and the best field per token is summed; prominence breaks
 * ties. Same behaviour the frontend had, so search feels unchanged.
 */
export const searchService = {
  async search(ctx: AppContext, query: string, limit: number, filters: { universe?: string; type?: string } = {}): Promise<SearchResponse> {
    const tokens = tokenize(query)
    if (!tokens.length) return { query, websites: [], universes: [] }
    const fullQuery = normalize(query)
    // Candidates: anything matching the shortest token is a superset of every AND result.
    const seed = [...tokens].sort((a, b) => a.length - b.length)[0]
    const candidates = await websiteRepo.all(ctx.db, { q: seed, universe: filters.universe, type: filters.type }, 500)

    const hits: SearchHit[] = []
    for (const w of candidates) {
      let total = 0
      let matched: SearchHit['matched'] = 'description'
      let complete = true
      let bestField = 0
      for (const token of tokens) {
        const s = scoreToken(token, w, fullQuery)
        if (s.score === 0) {
          complete = false
          break
        }
        total += s.score
        if (s.score > bestField) {
          bestField = s.score
          matched = s.matched
        }
      }
      if (complete) hits.push({ website: toLight(w), score: total + w.importance / 20, matched })
    }
    hits.sort((a, b) => b.score - a.score || a.website.name.localeCompare(b.website.name))

    const universes = (await universeRepo.list(ctx.db))
      .map((u) => {
        const name = normalize(u.name)
        const description = normalize(u.description)
        let score = 0
        for (const token of tokens) {
          if (name === token) score += SCORE.nameExact
          else if (name.startsWith(token)) score += SCORE.nameStarts
          else if (name.includes(token)) score += SCORE.nameContains
          else if (description.includes(token)) score += SCORE.description
          else return null
        }
        return { ...toPublicUniverse(u), score }
      })
      .filter((u): u is PublicUniverse & { score: number } => !!u)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    return { query, websites: hits.slice(0, limit), universes }
  },
}
