import type { UniverseDefinition, WebsiteDefinition, WebsiteRelationship } from '../../types/galaxy'
import type { ApiRelationship, ApiUniverse, ApiWebsiteFull, ApiWebsiteLight } from './types'

/**
 * API records → the domain models the galaxy has used since Phase 1. The
 * slug becomes the domain `id` so procedural positions, relationships and
 * URLs stay stable whichever backend serves the data.
 */
export function mapUniverse(u: ApiUniverse): UniverseDefinition {
  return {
    id: u.slug,
    remoteId: u.id,
    name: u.name,
    description: u.description,
    position: u.visualConfig.position,
    scale: u.visualConfig.scale,
    visualType: u.visualType,
    palette: u.visualConfig.palette,
    seed: u.visualConfig.seed,
    layout: u.visualConfig.layout,
    websiteCount: u.websiteCount,
  }
}

export function mapWebsite(w: ApiWebsiteLight | ApiWebsiteFull): WebsiteDefinition {
  const full = 'description' in w ? (w as ApiWebsiteFull) : null
  return {
    id: w.slug,
    remoteId: w.id,
    name: w.name,
    universeId: w.universeSlug,
    objectType: w.objectType,
    importance: w.importance,
    url: w.url ?? undefined,
    description: full?.description,
    tags: w.tags,
    accent: w.accent ?? undefined,
    glyph: w.glyph ?? undefined,
    topic: w.topic ?? undefined,
    orbitAnchorId: w.orbitAnchorId ?? undefined,
    logo: w.logoUrl ?? undefined,
    popularity: w.popularityScore,
    trendingScore: w.trendingScore,
    trendDirection: w.trendDirection,
    isTrending: w.isTrending,
    isEmerging: w.isEmerging,
    detailLoaded: !!full,
  }
}

export function mapRelationship(r: ApiRelationship): WebsiteRelationship {
  return {
    source: r.source.slug,
    target: r.target.slug,
    type: r.type,
    directed: r.directed,
    note: r.note ?? undefined,
  }
}
