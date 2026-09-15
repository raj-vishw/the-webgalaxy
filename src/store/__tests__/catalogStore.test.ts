import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/universeApi', () => ({ universeApi: { list: vi.fn() } }))
vi.mock('../../services/websiteApi', () => ({ websiteApi: { listAll: vi.fn(), get: vi.fn() } }))
vi.mock('../../services/relationshipApi', () => ({ relationshipApi: { listAll: vi.fn() } }))

import { ApiError } from '../../services/api'
import { relationshipApi } from '../../services/relationshipApi'
import { universeApi } from '../../services/universeApi'
import { websiteApi } from '../../services/websiteApi'
import { universes as bundledUniverses } from '../../data/universes'
import { useCatalogStore } from '../catalogStore'

const failure = new ApiError(0, 'NETWORK', 'The galaxy could not be reached.')

describe('catalog store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(universeApi.list).mockReset()
    vi.mocked(websiteApi.listAll).mockReset()
    vi.mocked(relationshipApi.listAll).mockReset()
  })

  it('starts from the bundled dataset so the galaxy renders immediately', () => {
    const s = useCatalogStore.getState()
    expect(s.source).toBe('static')
    expect(s.universes.length).toBe(bundledUniverses.length)
    expect(s.websites.length).toBeGreaterThan(50)
    expect(s.websites.every((w) => w.detailLoaded)).toBe(true)
  })

  it('keeps rendering the bundled data and reports the error when the API is down', async () => {
    vi.mocked(universeApi.list).mockRejectedValue(failure)
    await useCatalogStore.getState().load()
    const s = useCatalogStore.getState()
    expect(s.status).toBe('error')
    expect(s.error).toBe('The galaxy could not be reached.')
    expect(s.source).toBe('static')
    expect(s.stale).toBe(true)
    expect(s.universes.length).toBe(bundledUniverses.length)
  })

  it('loads progressively and caches a successful load', async () => {
    const universe = { ...bundledUniverses[0], id: 'ai', remoteId: 'u1' }
    vi.mocked(universeApi.list).mockResolvedValue([universe])
    vi.mocked(websiteApi.listAll).mockResolvedValue([
      { id: 'claude', remoteId: 'w1', name: 'Claude', universeId: 'ai', objectType: 'planet', importance: 88, url: 'https://claude.ai', tags: [], detailLoaded: false },
      { id: 'newsite', remoteId: 'w2', name: 'New Site', universeId: 'ai', objectType: 'comet', importance: 40, url: 'https://new.site', tags: [], detailLoaded: false },
    ])
    vi.mocked(relationshipApi.listAll).mockResolvedValue([])
    await useCatalogStore.getState().load()
    const s = useCatalogStore.getState()
    expect(s.status).toBe('ready')
    expect(s.source).toBe('api')
    expect(s.universes.map((u) => u.id)).toEqual(['ai'])
    expect(s.websites.map((w) => w.id)).toEqual(['claude', 'newsite'])
    // Details already known from the bundled dataset are kept across a reload.
    expect(s.websites[0].detailLoaded).toBe(true)
    expect(s.websites[1].detailLoaded).toBe(false)
    const cached = JSON.parse(window.localStorage.getItem('webgalaxy.catalog.v1') ?? 'null')
    expect(cached.websites.length).toBe(2)
  })

  it('merges full website details on demand', async () => {
    vi.mocked(websiteApi.get).mockResolvedValue({ website: { id: 'newsite', remoteId: 'w2', name: 'New Site', universeId: 'ai', objectType: 'comet', description: 'A brand new world.', detailLoaded: true }, relationships: [] })
    await useCatalogStore.getState().loadWebsiteDetail('newsite')
    const w = useCatalogStore.getState().websites.find((w) => w.id === 'newsite')
    expect(w?.description).toBe('A brand new world.')
    expect(w?.detailLoaded).toBe(true)
    expect(useCatalogStore.getState().detailStatus.newsite).toBe('ready')
    expect(websiteApi.get).toHaveBeenCalledTimes(1)
  })

  it('retries after a failure and recovers', async () => {
    vi.mocked(universeApi.list).mockRejectedValueOnce(failure).mockResolvedValue([{ ...bundledUniverses[1], remoteId: 'u2' }])
    vi.mocked(websiteApi.listAll).mockResolvedValue([])
    vi.mocked(relationshipApi.listAll).mockResolvedValue([])
    await useCatalogStore.getState().load()
    expect(useCatalogStore.getState().status).toBe('error')
    await useCatalogStore.getState().retry()
    expect(useCatalogStore.getState().status).toBe('ready')
    expect(useCatalogStore.getState().error).toBeNull()
  })
})
