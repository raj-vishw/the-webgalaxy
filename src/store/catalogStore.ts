import { useMemo } from 'react'
import { create } from 'zustand'
import { relationships as staticRelationships } from '../data/relationships'
import { TRENDING_THRESHOLD, trends as staticTrends } from '../data/trends'
import { universes as staticUniverses } from '../data/universes'
import { websites as staticWebsites } from '../data/websites'
import { loadCatalogCache, saveCatalogCache } from '../lib/catalogCache'
import { ApiError } from '../services/api'
import { relationshipApi } from '../services/relationshipApi'
import { universeApi } from '../services/universeApi'
import { websiteApi } from '../services/websiteApi'
import type { UniverseDefinition, WebsiteDefinition, WebsiteRelationship } from '../types/galaxy'

/**
 * The catalogue the whole galaxy renders from: universes, websites and the
 * relationship graph. It starts from what is available instantly (the last
 * cached load, else the bundled Phase 1–5 dataset), then loads progressively
 * from the API — universes first, then lightweight website records, then
 * relationships — and swaps each layer in as it arrives. Full website
 * records are fetched on demand when one is selected.
 *
 * Failures never blank the scene: whatever was rendering keeps rendering and
 * the status just says so, with a retry.
 */
export type CatalogSource = 'static' | 'cache' | 'api'
export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CatalogState {
  universes: UniverseDefinition[]
  websites: WebsiteDefinition[]
  relationships: WebsiteRelationship[]
  source: CatalogSource
  status: CatalogStatus
  /** Which progressive step is in flight, for the loading indicator. */
  step: 'universes' | 'websites' | 'relationships' | null
  error: string | null
  /** When the data on screen was last confirmed by the API. */
  fetchedAt: number | null
  /** True while showing cached/bundled data that the API could not refresh. */
  stale: boolean
  detailStatus: Record<string, 'loading' | 'ready' | 'error'>

  load: () => Promise<void>
  retry: () => Promise<void>
  /** Fetches the full record for a website and merges it in. */
  loadWebsiteDetail: (id: string) => Promise<void>
  /** Adds or replaces a website (e.g. after a search result arrives that isn't cached yet). */
  upsertWebsites: (websites: WebsiteDefinition[]) => void
}

/** Bundled websites, with the static trend snapshot folded into each. */
function bundledWebsites(list: WebsiteDefinition[]): WebsiteDefinition[] {
  const trendBySlug = new Map(staticTrends.map((t) => [t.websiteId, t]))
  return list.map((w) => {
    const trend = trendBySlug.get(w.id)
    return {
      ...w,
      popularity: w.importance,
      trendingScore: trend?.trendingScore ?? 0,
      trendDirection: trend?.trendDirection ?? 'steady',
      isTrending: !!trend && !trend.emerging && trend.trendingScore >= TRENDING_THRESHOLD,
      isEmerging: !!trend?.emerging,
      detailLoaded: true,
    }
  })
}

/** Inline relationships declared on websites plus the shared list. */
function bundledRelationships(): WebsiteRelationship[] {
  const inline = staticWebsites.flatMap((w) => (w.relationships ?? []).map((r) => ({ source: w.id, ...r })))
  return [...inline, ...staticRelationships]
}

const cached = typeof window !== 'undefined' ? loadCatalogCache() : null
const initial = cached
  ? { universes: cached.universes, websites: cached.websites, relationships: cached.relationships, source: 'cache' as const, fetchedAt: cached.fetchedAt }
  : { universes: staticUniverses, websites: bundledWebsites(staticWebsites), relationships: bundledRelationships(), source: 'static' as const, fetchedAt: null }

const describe = (error: unknown) =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Unknown error'

let inflight: Promise<void> | null = null

export const useCatalogStore = create<CatalogState>((set, get) => ({
  ...initial,
  status: 'idle',
  step: null,
  error: null,
  stale: false,
  detailStatus: {},

  load: () => {
    if (inflight) return inflight
    inflight = (async () => {
      set({ status: 'loading', error: null, step: 'universes' })
      try {
        const universes = await universeApi.list()
        set({ universes, step: 'websites' })
        const websites = await websiteApi.listAll()
        // Keep any full details already fetched this session.
        const details = new Map(get().websites.filter((w) => w.detailLoaded && w.description).map((w) => [w.id, w]))
        const merged = websites.map((w) => {
          const known = details.get(w.id)
          return known ? { ...w, description: known.description, detailLoaded: true } : w
        })
        set({ websites: merged, step: 'relationships' })
        const relationships = await relationshipApi.listAll()
        const fetchedAt = Date.now()
        set({ relationships, source: 'api', status: 'ready', step: null, stale: false, fetchedAt, error: null })
        saveCatalogCache({ universes, websites, relationships, fetchedAt })
      } catch (error) {
        // Whatever loaded so far (or the cache / bundled data) keeps rendering.
        set({ status: 'error', step: null, error: describe(error), stale: get().source !== 'api' })
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  retry: () => get().load(),

  loadWebsiteDetail: async (id) => {
    const s = get()
    const website = s.websites.find((w) => w.id === id)
    if (!website || website.detailLoaded || s.detailStatus[id] === 'loading') return
    if (s.source === 'static') return
    set({ detailStatus: { ...s.detailStatus, [id]: 'loading' } })
    try {
      const { website: full } = await websiteApi.get(id)
      set((state) => ({
        websites: state.websites.map((w) => (w.id === id ? { ...w, ...full, detailLoaded: true } : w)),
        detailStatus: { ...state.detailStatus, [id]: 'ready' },
      }))
    } catch {
      set((state) => ({ detailStatus: { ...state.detailStatus, [id]: 'error' } }))
    }
  },

  upsertWebsites: (incoming) =>
    set((state) => {
      const byId = new Map(state.websites.map((w) => [w.id, w]))
      for (const w of incoming) byId.set(w.id, { ...byId.get(w.id), ...w })
      return { websites: [...byId.values()] }
    }),
}))

/** Snapshot accessor for non-React code (services, navigation). */
export const getCatalog = () => useCatalogStore.getState()

/** Convenience selectors. */
export const useUniverses = () => useCatalogStore((s) => s.universes)
export const useWebsites = () => useCatalogStore((s) => s.websites)
export const useWebsite = (id: string | null) => useCatalogStore((s) => (id ? s.websites.find((w) => w.id === id) ?? null : null))
export const useUniverse = (id: string | null) => useCatalogStore((s) => (id ? s.universes.find((u) => u.id === id) ?? null : null))

/** Websites of one universe (memoised per catalogue change). */
export function useWebsitesInUniverse(universeId: string | null): WebsiteDefinition[] {
  const websites = useCatalogStore((s) => s.websites)
  return useMemo(() => (universeId ? websites.filter((w) => w.universeId === universeId) : []), [websites, universeId])
}

/** Non-hook counterpart for services. */
export const websitesInUniverse = (universeId: string) => getCatalog().websites.filter((w) => w.universeId === universeId)

// The directory import (~1 200 websites) ships as its own chunk so the first
// paint only carries the curated set; it joins the bundled fallback as soon
// as it arrives, unless the API or the cache already provided the catalogue.
if (initial.source === 'static' && typeof window !== 'undefined') {
  void import('../data/directory').then(({ directoryWebsites, directoryRelationships }) => {
    const state = useCatalogStore.getState()
    if (state.source !== 'static') return
    const known = new Set(state.websites.map((w) => w.id))
    useCatalogStore.setState({
      websites: [...state.websites, ...bundledWebsites(directoryWebsites.filter((w) => !known.has(w.id)))],
      relationships: [...state.relationships, ...directoryRelationships],
    })
  })
}
