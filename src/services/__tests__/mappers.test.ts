import { describe, expect, it } from 'vitest'
import { mapRelationship, mapUniverse, mapWebsite } from '../api/mappers'
import type { ApiRelationship, ApiUniverse, ApiWebsiteFull, ApiWebsiteLight } from '../api/types'

const universe: ApiUniverse = {
  id: 'uuid-u',
  slug: 'ai',
  name: 'AI',
  description: 'desc',
  visualType: 'spiral',
  visualConfig: { position: [-36, 2, -12], scale: 12, palette: { core: '#fff', primary: '#8fb0ff', secondary: '#c9d7ff' }, seed: 11, layout: { spread: [0.8, 0.42, 0.7], coreBias: 0.6, energy: 1.2, dust: 1.5 } },
  sortOrder: 0,
  isActive: true,
  websiteCount: 3,
}

const light: ApiWebsiteLight = {
  id: 'uuid-w',
  slug: 'claude',
  name: 'Claude',
  url: 'https://claude.ai/',
  universeId: 'uuid-u',
  universeSlug: 'ai',
  objectType: 'planet',
  importance: 88,
  popularityScore: 88,
  trendingScore: 0.92,
  trendDirection: 'up',
  isTrending: true,
  isEmerging: false,
  accent: '#d97757',
  glyph: 'Cl',
  logoUrl: null,
  orbitAnchorId: null,
  tags: ['assistant', 'llm'],
  positionSeed: 42,
}

describe('API mappers', () => {
  it('maps a universe using its slug as the domain id', () => {
    const u = mapUniverse(universe)
    expect(u.id).toBe('ai')
    expect(u.remoteId).toBe('uuid-u')
    expect(u.position).toEqual([-36, 2, -12])
    expect(u.layout.coreBias).toBe(0.6)
    expect(u.websiteCount).toBe(3)
  })

  it('maps a light website without marking details loaded', () => {
    const w = mapWebsite(light)
    expect(w.id).toBe('claude')
    expect(w.universeId).toBe('ai')
    expect(w.detailLoaded).toBe(false)
    expect(w.description).toBeUndefined()
    expect(w.isTrending).toBe(true)
    expect(w.tags).toEqual(['assistant', 'llm'])
  })

  it('maps a full website with description and details loaded', () => {
    const full: ApiWebsiteFull = { ...light, description: 'AI assistant by Anthropic.', isActive: true, createdAt: '', updatedAt: '', relationships: [] }
    const w = mapWebsite(full)
    expect(w.detailLoaded).toBe(true)
    expect(w.description).toBe('AI assistant by Anthropic.')
  })

  it('maps relationships to slugs', () => {
    const r: ApiRelationship = { id: 'r', type: 'alternative', directed: false, strength: 1, note: null, source: { id: 'a', slug: 'chatgpt', name: 'ChatGPT' }, target: { id: 'b', slug: 'claude', name: 'Claude' } }
    expect(mapRelationship(r)).toEqual({ source: 'chatgpt', target: 'claude', type: 'alternative', directed: false, note: undefined })
  })
})
