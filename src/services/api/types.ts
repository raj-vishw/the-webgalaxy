/** Wire shapes of the public API (see backend/API.md). */
export interface ApiUniverse {
  id: string
  slug: string
  name: string
  description: string
  visualType: 'spiral' | 'cluster' | 'nebula' | 'stream' | 'planetary'
  visualConfig: {
    position: [number, number, number]
    scale: number
    palette: { core: string; primary: string; secondary: string }
    seed: number
    layout: { spread: [number, number, number]; coreBias: number; energy: number; dust: number }
  }
  sortOrder: number
  isActive: boolean
  websiteCount?: number
}

export interface ApiWebsiteLight {
  id: string
  slug: string
  name: string
  url: string | null
  universeId: string
  universeSlug: string
  objectType: 'star' | 'planet' | 'moon' | 'comet'
  importance: number
  popularityScore: number
  trendingScore: number
  trendDirection: 'up' | 'steady' | 'down'
  isTrending: boolean
  isEmerging: boolean
  accent: string | null
  glyph: string | null
  topic: string | null
  logoUrl: string | null
  orbitAnchorId: string | null
  tags: string[]
  positionSeed: number
}

export interface ApiRelationship {
  id: string
  type: 'related' | 'alternative' | 'integration' | 'ecosystem' | 'complementary' | 'competitor' | 'same-company'
  directed: boolean
  strength: number
  note: string | null
  source: { id: string; slug: string; name: string }
  target: { id: string; slug: string; name: string }
}

export interface ApiWebsiteFull extends ApiWebsiteLight {
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  relationships: ApiRelationship[]
}

export interface ApiSearchHit {
  website: ApiWebsiteLight
  score: number
  matched: 'name' | 'universe' | 'tag' | 'description'
}

export interface ApiSearchResponse {
  query: string
  websites: ApiSearchHit[]
  universes: (ApiUniverse & { score: number })[]
}

export interface ApiSubmission {
  id: string
  websiteName: string
  url: string
  description: string
  requestedUniverseSlug: string | null
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

export interface ApiUrlCheck {
  valid: boolean
  exists: boolean
  pending: boolean
  website: { slug: string; name: string } | null
}
