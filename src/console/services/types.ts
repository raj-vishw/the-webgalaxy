export interface Universe {
  id: string
  slug: string
  name: string
  description: string
  visualType: string
  visualConfig: Record<string, unknown>
  sortOrder: number
  isActive: boolean
  websiteCount?: number
}

export interface Website {
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
  isActive: boolean
  accent: string | null
  glyph: string | null
  topic: string | null
  logoUrl: string | null
  orbitAnchorId: string | null
  tags: string[]
  description: string
  updatedAt: string
  relationships: Relationship[]
}

export interface Relationship {
  id: string
  type: string
  directed: boolean
  strength: number
  note: string | null
  source: { id: string; slug: string; name: string }
  target: { id: string; slug: string; name: string }
}

export interface Submission {
  id: string
  websiteName: string
  url: string
  description: string
  requestedUniverseSlug: string | null
  requestedUniverseName: string | null
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  websiteId: string | null
}

export interface Tag {
  id: string
  name: string
  slug: string
  websiteCount: number
}

export interface Overview {
  websites: { total: number; active: number; trending: number; emerging: number }
  universes: number
  submissions: { pending: number; approved: number; rejected: number }
  relationships: number
}

export interface User {
  id: string
  email: string
}

export const RELATIONSHIP_TYPES = ['related', 'alternative', 'integration', 'ecosystem', 'complementary', 'competitor', 'same-company'] as const
export const OBJECT_TYPES = ['star', 'planet', 'moon', 'comet'] as const
export const VISUAL_TYPES = ['spiral', 'cluster', 'nebula', 'stream', 'planetary'] as const
