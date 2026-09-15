import { request } from './api'
import { mapUniverse } from './api/mappers'
import type { ApiUniverse } from './api/types'

export const universeApi = {
  async list() {
    const res = await request<ApiUniverse[]>('/universes')
    return res.data.map(mapUniverse)
  },
  async get(idOrSlug: string) {
    const res = await request<ApiUniverse>(`/universes/${encodeURIComponent(idOrSlug)}`)
    return mapUniverse(res.data)
  },
}
