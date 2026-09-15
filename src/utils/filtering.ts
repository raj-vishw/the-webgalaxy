import type { CelestialObjectType, WebsiteDefinition } from '../types/galaxy'
import { importanceFor } from './celestial'

export type ImportanceBand = 'popular' | 'medium' | 'emerging'

/**
 * Discovery-layer filters. `related` / `alternatives` are relative to the
 * focused website when there is one (see `discoveryFilterContext`).
 */
export type DiscoveryFilter = 'trending' | 'emerging' | 'related' | 'alternatives'

export interface WebsiteFilters {
  universeId: string | null
  objectType: CelestialObjectType | null
  importance: ImportanceBand | null
  discovery: DiscoveryFilter | null
}

/** Id sets the discovery filter is evaluated against; supplied by the discovery service. */
export type FilterContext = Record<DiscoveryFilter, Set<string>>

export const EMPTY_FILTERS: WebsiteFilters = { universeId: null, objectType: null, importance: null, discovery: null }

export const DISCOVERY_FILTERS: Record<DiscoveryFilter, string> = {
  trending: 'Trending',
  emerging: 'Emerging',
  related: 'Related',
  alternatives: 'Alternatives',
}

export const IMPORTANCE_BANDS: Record<ImportanceBand, { label: string; min: number; max: number }> = {
  popular: { label: 'Popular', min: 0.8, max: 1.01 },
  medium: { label: 'Medium', min: 0.55, max: 0.8 },
  emerging: { label: 'Emerging', min: 0, max: 0.55 },
}

export function importanceBandFor(website: WebsiteDefinition): ImportanceBand {
  const value = importanceFor(website)
  if (value >= IMPORTANCE_BANDS.popular.min) return 'popular'
  if (value >= IMPORTANCE_BANDS.medium.min) return 'medium'
  return 'emerging'
}

export function hasActiveFilters(filters: WebsiteFilters): boolean {
  return filters.universeId !== null || filters.objectType !== null || filters.importance !== null || filters.discovery !== null
}

/**
 * Whether a website passes every active filter (filters combine with AND).
 * A discovery filter without a context cannot be evaluated and is ignored.
 */
export function matchesFilters(website: WebsiteDefinition, filters: WebsiteFilters, context?: FilterContext): boolean {
  if (filters.universeId && website.universeId !== filters.universeId) return false
  if (filters.objectType && website.objectType !== filters.objectType) return false
  if (filters.importance && importanceBandFor(website) !== filters.importance) return false
  if (filters.discovery && context && !context[filters.discovery].has(website.id)) return false
  return true
}

export function applyFilters(websites: WebsiteDefinition[], filters: WebsiteFilters, context?: FilterContext): WebsiteDefinition[] {
  return hasActiveFilters(filters) ? websites.filter((w) => matchesFilters(w, filters, context)) : websites
}
