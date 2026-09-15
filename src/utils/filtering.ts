import type { CelestialObjectType, WebsiteDefinition } from '../types/galaxy'
import { importanceFor } from './celestial'

export type ImportanceBand = 'popular' | 'medium' | 'emerging'

export interface WebsiteFilters {
  universeId: string | null
  objectType: CelestialObjectType | null
  importance: ImportanceBand | null
}

export const EMPTY_FILTERS: WebsiteFilters = { universeId: null, objectType: null, importance: null }

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
  return filters.universeId !== null || filters.objectType !== null || filters.importance !== null
}

/** Whether a website passes every active filter (filters combine with AND). */
export function matchesFilters(website: WebsiteDefinition, filters: WebsiteFilters): boolean {
  if (filters.universeId && website.universeId !== filters.universeId) return false
  if (filters.objectType && website.objectType !== filters.objectType) return false
  if (filters.importance && importanceBandFor(website) !== filters.importance) return false
  return true
}

export function applyFilters(websites: WebsiteDefinition[], filters: WebsiteFilters): WebsiteDefinition[] {
  return hasActiveFilters(filters) ? websites.filter((w) => matchesFilters(w, filters)) : websites
}
