import { getCatalog } from '../store/catalogStore'
import type { WebsiteDefinition } from '../types/galaxy'
import { isDiscoverable, pickRandomUniverse, pickRandomWebsite, type DiscoveryMode } from '../utils/discovery'
import type { SearchResults, WebsiteMatch } from '../utils/search'
import { getRecommendationProvider } from './recommendationProvider'
import {
  getEmergingWebsites,
  getSimilarWebsites,
  getTrendingWebsites,
  isEmerging,
  isTrending,
  RELATION_PHRASE,
  type Recommendation,
  type RecommendationContext,
} from './recommendationService'
import {
  getAlternatives,
  getIntegrations,
  getRelatedWebsites,
  hasRelationships,
  type ResolvedRelationship,
} from './relationshipService'

/**
 * Discovery service — turns a discovery mode plus the current context into
 * a destination, and answers the "highlight these" questions behind Explore
 * Similar / Find Alternatives / Works With. Sits on top of the relationship
 * and recommendation services; the UI never touches the datasets directly.
 */

export interface DiscoveryModeInfo {
  mode: DiscoveryMode
  label: string
  hint: string
  glyph: string
  /** Needs a focused website to make sense. */
  needsWebsite: boolean
}

export const DISCOVERY_MODES: DiscoveryModeInfo[] = [
  { mode: 'random', label: 'Random', hint: 'Anywhere at all', glyph: '✨', needsWebsite: false },
  { mode: 'similar', label: 'Similar', hint: 'Like this one', glyph: '≈', needsWebsite: true },
  { mode: 'alternative', label: 'Alternatives', hint: 'Instead of this', glyph: '⇄', needsWebsite: true },
  { mode: 'related', label: 'Related', hint: 'Connected to it', glyph: '⟡', needsWebsite: true },
  { mode: 'trending', label: 'Trending', hint: 'Rising now', glyph: '🔥', needsWebsite: false },
  { mode: 'emerging', label: 'Emerging', hint: 'Lesser-known', glyph: '✦', needsWebsite: false },
  { mode: 'universe', label: 'Universe', hint: 'A whole region', glyph: '◎', needsWebsite: false },
]

export const DISCOVERY_MODE_LABEL = Object.fromEntries(DISCOVERY_MODES.map((m) => [m.mode, m.label])) as Record<DiscoveryMode, string>

/** Highlight sets behind the panel actions. */
export type HighlightKind = 'similar' | 'alternative' | 'integration'

export const HIGHLIGHT_LABEL: Record<HighlightKind, { title: string; action: string; empty: string }> = {
  similar: { title: 'Similar to', action: 'Explore Similar', empty: 'Nothing similar charted yet.' },
  alternative: { title: 'Alternatives to', action: 'Find Alternatives', empty: 'No alternatives are recorded for this website.' },
  integration: { title: 'Works with', action: 'Works With', empty: 'No integrations are recorded for this website.' },
}

const toRecommendation = (r: ResolvedRelationship, sourceName: string): Recommendation => ({
  website: r.website,
  score: 1,
  reasons: [r.note ?? RELATION_PHRASE[r.type](sourceName)],
  relationship: r,
})

/**
 * The websites to light up for a highlight action. Alternatives and
 * integrations come only from explicit data — nothing is inferred; similarity
 * is computed.
 */
export function getHighlightSet(kind: HighlightKind, websiteId: string, limit = 6): Recommendation[] {
  const source = getCatalog().websites.find((w) => w.id === websiteId)
  if (!source) return []
  if (kind === 'similar') return getSimilarWebsites(websiteId, limit)
  const list = kind === 'alternative' ? getAlternatives(websiteId) : getIntegrations(websiteId)
  return list.slice(0, limit).map((r) => toRecommendation(r, source.name))
}

/** Candidate ids a discovery mode chooses from (used for the scanning animation too). */
export function discoveryPool(mode: DiscoveryMode, ctx: RecommendationContext): string[] {
  const current = ctx.currentWebsiteId
  const { universes, websites } = getCatalog()
  switch (mode) {
    case 'universe':
      return universes.map((u) => u.id)
    case 'random':
      return websites.filter(isDiscoverable).map((w) => w.id)
    case 'trending':
      return getTrendingWebsites().map((w) => w.id)
    case 'emerging':
      return getEmergingWebsites().map((w) => w.id)
    case 'similar':
      return current ? getSimilarWebsites(current, 6).map((r) => r.website.id) : []
    case 'alternative':
      return current ? getAlternatives(current).map((r) => r.website.id) : []
    case 'related':
      return current ? getRelatedWebsites(current, 7).map((r) => r.website.id) : []
  }
}

export interface DiscoveryTarget {
  kind: 'website' | 'universe'
  id: string
  reason: string
}

/**
 * Choose where a discovery journey ends. Ranked modes (similar/related/
 * alternative) prefer the strongest unvisited candidate; the others pick at
 * random from their pool, never the place the camera already is.
 */
export function pickDiscoveryTarget(mode: DiscoveryMode, ctx: RecommendationContext): DiscoveryTarget | null {
  const viewed = new Set(ctx.history.filter((e) => e.kind === 'website').map((e) => e.id))
  const { universes, websites } = getCatalog()
  if (mode === 'universe') {
    const universe = pickRandomUniverse(universes, ctx.currentUniverseId ?? undefined)
    return universe ? { kind: 'universe', id: universe.id, reason: 'A random region' } : null
  }
  if (mode === 'random') {
    const website = pickRandomWebsite(websites, ctx.currentWebsiteId ?? undefined)
    return website ? { kind: 'website', id: website.id, reason: 'Chosen at random' } : null
  }
  const ids = discoveryPool(mode, ctx).filter((id) => id !== ctx.currentWebsiteId)
  if (!ids.length) return null
  const ranked = mode === 'similar' || mode === 'related' || mode === 'alternative'
  const fresh = ids.filter((id) => !viewed.has(id))
  const pool = fresh.length ? fresh : ids
  const id = ranked ? pool[0] : pool[Math.floor(Math.random() * pool.length)]
  const reason =
    mode === 'trending' ? 'Trending now' : mode === 'emerging' ? 'An emerging website' : `${DISCOVERY_MODE_LABEL[mode]} discovery`
  return { kind: 'website', id, reason }
}

/** "You may also explore" for the current context, skipping what is on screen already. */
export function recommendationsFor(ctx: RecommendationContext, limit = 3, exclude: Iterable<string> = []): Recommendation[] | Promise<Recommendation[]> {
  return getRecommendationProvider().recommend(ctx, limit, exclude)
}

// ─── Search & filter integration ───────────────────────────────────────────

export interface SearchExpansion {
  /** The direct match the expansion is anchored on. */
  anchor: WebsiteDefinition | null
  related: WebsiteMatch[]
  alternatives: WebsiteMatch[]
}

/**
 * Extends direct search results with what the top match connects to. Only
 * fires when the first result is a confident name match, and never repeats a
 * website already in the direct list.
 */
export function expandSearch(results: SearchResults, query: string): SearchExpansion {
  const top = results.websites[0]
  const q = query.trim().toLowerCase()
  const confident = !!top && q.length >= 2 && top.website.name.toLowerCase().startsWith(q)
  if (!top || !confident) return { anchor: null, related: [], alternatives: [] }
  const shown = new Set(results.websites.map((m) => m.website.id))
  const universes = getCatalog().universes
  const toMatch = (r: ResolvedRelationship): WebsiteMatch => ({
    kind: 'website',
    website: r.website,
    universe: universes.find((u) => u.id === r.website.universeId),
    score: 0,
    reason: r.note ?? RELATION_PHRASE[r.type](top.website.name),
  })
  const alternatives = getAlternatives(top.website.id).filter((r) => !shown.has(r.website.id)).slice(0, 3)
  const altIds = new Set(alternatives.map((r) => r.website.id))
  const related = getRelatedWebsites(top.website.id)
    .filter((r) => r.type !== 'alternative' && !shown.has(r.website.id) && !altIds.has(r.website.id))
    .slice(0, 3)
  return { anchor: top.website, related: related.map(toMatch), alternatives: alternatives.map(toMatch) }
}

/** Precomputed id sets so the discovery filters stay O(1) per website. */
export interface DiscoveryFilterContext {
  trending: Set<string>
  emerging: Set<string>
  related: Set<string>
  alternatives: Set<string>
}

/**
 * Sets for the discovery filters. With a website focused, "related" and
 * "alternatives" mean *its* connections; otherwise they mean any website that
 * has such connections at all.
 */
export function discoveryFilterContext(selectedWebsiteId: string | null): DiscoveryFilterContext {
  const { websites } = getCatalog()
  const related = new Set<string>()
  const alternatives = new Set<string>()
  if (selectedWebsiteId) {
    for (const r of getRelatedWebsites(selectedWebsiteId)) related.add(r.website.id)
    for (const r of getAlternatives(selectedWebsiteId)) alternatives.add(r.website.id)
    related.add(selectedWebsiteId)
    alternatives.add(selectedWebsiteId)
  } else {
    for (const w of websites) {
      if (hasRelationships(w.id)) related.add(w.id)
      if (hasRelationships(w.id, ['alternative'])) alternatives.add(w.id)
    }
  }
  return {
    trending: new Set(websites.filter((w) => isTrending(w.id)).map((w) => w.id)),
    emerging: new Set(websites.filter((w) => isEmerging(w.id)).map((w) => w.id)),
    related,
    alternatives,
  }
}

/**
 * Backend-aware target choice: random / trending / emerging come from the
 * API when the catalogue is online (so a freshly published website can be
 * discovered at once); everything else — and every failure — falls back to
 * the local pick, which the animation cannot tell apart.
 */
export async function resolveDiscoveryTarget(mode: DiscoveryMode, ctx: RecommendationContext): Promise<DiscoveryTarget | null> {
  const catalog = getCatalog()
  if (catalog.source === 'api' && (mode === 'random' || mode === 'trending' || mode === 'emerging')) {
    try {
      const { discoveryApi } = await import('./discoveryApi')
      if (mode === 'random') {
        const website = await discoveryApi.random(ctx.currentWebsiteId ?? undefined)
        catalog.upsertWebsites([website])
        return { kind: 'website', id: website.id, reason: 'Chosen at random' }
      }
      const list = mode === 'trending' ? await discoveryApi.trending(12) : await discoveryApi.emerging(12)
      catalog.upsertWebsites(list)
      const viewed = new Set(ctx.history.filter((e) => e.kind === 'website').map((e) => e.id))
      const pool = list.filter((w) => w.id !== ctx.currentWebsiteId)
      const fresh = pool.filter((w) => !viewed.has(w.id))
      const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))]
      if (pick) return { kind: 'website', id: pick.id, reason: mode === 'trending' ? 'Trending now' : 'An emerging website' }
    } catch {
      // fall through to the local pick
    }
  }
  return pickDiscoveryTarget(mode, ctx)
}
