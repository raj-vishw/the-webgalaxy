import type { UniverseDefinition, WebsiteDefinition, WebsiteRelationship } from '../types/galaxy'

/**
 * Last successfully loaded public catalogue, kept in localStorage so the
 * galaxy still renders when the API is unreachable. Public data only —
 * nothing personal is stored here.
 */
const KEY = 'webgalaxy.catalog.v1'

export interface CachedCatalog {
  universes: UniverseDefinition[]
  websites: WebsiteDefinition[]
  relationships: WebsiteRelationship[]
  fetchedAt: number
}

export function loadCatalogCache(): CachedCatalog | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedCatalog
    if (!Array.isArray(parsed.universes) || !Array.isArray(parsed.websites) || !parsed.universes.length) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCatalogCache(value: CachedCatalog) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Quota or private mode: the bundled dataset remains the fallback.
  }
}
