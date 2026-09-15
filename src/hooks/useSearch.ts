import { useEffect, useMemo, useState } from 'react'
import { discoveryFilterContext } from '../services/discoveryService'
import { searchApi } from '../services/searchApi'
import { useCatalogStore } from '../store/catalogStore'
import { useGalaxyStore } from '../store/galaxyStore'
import type { WebsiteFilters } from '../utils/filtering'
import { searchGalaxy, type SearchResults } from '../utils/search'

export type SearchSource = 'api' | 'local'

export interface SearchState {
  results: SearchResults
  /** True while an API answer is on its way (local results are shown meanwhile). */
  pending: boolean
  source: SearchSource
}

const EMPTY: SearchResults = { websites: [], universes: [] }
const DEBOUNCE_MS = 140

/**
 * Live search: the local index answers instantly on every keystroke (so
 * the overlay never feels laggy), then the backend's ranked answer replaces
 * it a moment later. If the API is unreachable the local answer simply
 * stands — the user never sees the difference. Results are mirrored into
 * the galaxy store so the scene can emphasise matches.
 */
export function useSearch(query: string, filters: WebsiteFilters, enabled: boolean): SearchState {
  const websites = useCatalogStore((s) => s.websites)
  const universes = useCatalogStore((s) => s.universes)
  const online = useCatalogStore((s) => s.source === 'api')
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const setSearchResults = useGalaxyStore((s) => s.setSearchResults)
  const trimmed = enabled ? query.trim() : ''
  const [remote, setRemote] = useState<{ query: string; filters: WebsiteFilters; results: SearchResults } | null>(null)

  const local = useMemo(() => {
    if (!trimmed) return EMPTY
    const context = filters.discovery ? discoveryFilterContext(selectedWebsiteId) : undefined
    return searchGalaxy(trimmed, websites, universes, filters, 12, context)
  }, [trimmed, filters, websites, universes, selectedWebsiteId])

  // The backend answer only counts while it matches what is being asked.
  const remoteValid = remote && remote.query === trimmed && remote.filters === filters ? remote.results : null

  useEffect(() => {
    if (!trimmed || !online) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const answer = await searchApi.search(trimmed, { universe: filters.universeId ?? undefined, type: filters.objectType ?? undefined, signal: controller.signal })
        // Backend filters cover universe/type; importance & discovery bands stay local.
        const narrow = filters.importance || filters.discovery
        const websitesFiltered = narrow ? answer.websites.filter((m) => local.websites.some((l) => l.website.id === m.website.id)) : answer.websites
        setRemote({ query: trimmed, filters, results: { websites: websitesFiltered, universes: answer.universes } })
      } catch {
        // The local answer stands.
      }
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, filters, online, local])

  const results = remoteValid ?? local
  const pending = !!trimmed && online && !remoteValid

  useEffect(() => {
    setSearchResults(trimmed ? results : null)
  }, [results, trimmed, setSearchResults])

  return { results, pending, source: remoteValid ? 'api' : 'local' }
}
