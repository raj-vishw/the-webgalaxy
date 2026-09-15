import { request } from './api'
import { mapWebsite } from './api/mappers'
import type { ApiWebsiteLight } from './api/types'

export const discoveryApi = {
  async random(excludeId?: string) {
    const res = await request<ApiWebsiteLight>('/discovery/random', { query: { exclude: excludeId }, timeout: 6000 })
    return mapWebsite(res.data)
  },
  async trending(limit = 6) {
    const res = await request<ApiWebsiteLight[]>('/discovery/trending', { query: { limit } })
    return res.data.map(mapWebsite)
  },
  async emerging(limit = 6) {
    const res = await request<ApiWebsiteLight[]>('/discovery/emerging', { query: { limit } })
    return res.data.map(mapWebsite)
  },
}
