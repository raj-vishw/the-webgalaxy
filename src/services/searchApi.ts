import { request } from './api'
import { mapUniverse, mapWebsite } from './api/mappers'
import type { ApiSearchResponse } from './api/types'
import { getCatalog } from '../store/catalogStore'
import type { SearchMatch, SearchResults } from '../utils/search'

/** Backend search, shaped exactly like the local `searchGalaxy` results. */
export const searchApi = {
  async search(query: string, options: { limit?: number; universe?: string; type?: string; signal?: AbortSignal } = {}): Promise<SearchResults> {
    const res = await request<ApiSearchResponse>('/search', {
      query: { q: query, limit: options.limit ?? 12, universe: options.universe, type: options.type },
      signal: options.signal,
      timeout: 6000,
    })
    // Hits name their universe by slug; resolve it from the catalogue.
    const universeById = new Map(getCatalog().universes.map((u) => [u.id, u]))
    const websites: SearchMatch[] = res.data.websites.map((hit) => {
      const website = mapWebsite(hit.website)
      return { kind: 'website', website, universe: universeById.get(website.universeId), score: hit.score }
    })
    return {
      websites: websites.filter((m): m is Extract<SearchMatch, { kind: 'website' }> => m.kind === 'website'),
      universes: res.data.universes.map((u) => ({ kind: 'universe', universe: mapUniverse(u), score: u.score })),
    }
  },
}
