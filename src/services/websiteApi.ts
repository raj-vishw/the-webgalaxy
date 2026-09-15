import { request, requestAll } from './api'
import { mapWebsite } from './api/mappers'
import type { ApiWebsiteFull, ApiWebsiteLight } from './api/types'

export interface WebsiteListParams {
  universe?: string
  type?: string
  trending?: boolean
  emerging?: boolean
  tag?: string
}

export const websiteApi = {
  /** Lightweight records for rendering — pages through everything. */
  async listAll(params: WebsiteListParams = {}) {
    const rows = await requestAll<ApiWebsiteLight>('/websites', { ...params, fields: 'light' }, 200)
    return rows.map(mapWebsite)
  },
  async list(params: WebsiteListParams & { page?: number; limit?: number } = {}) {
    const res = await request<ApiWebsiteLight[]>('/websites', { query: { ...params, fields: 'light' } })
    return { websites: res.data.map(mapWebsite), pagination: res.pagination }
  },
  /** Full record (description, relationships) — fetched when a website is selected. */
  async get(idOrSlug: string) {
    const res = await request<ApiWebsiteFull>(`/websites/${encodeURIComponent(idOrSlug)}`)
    return { website: mapWebsite(res.data), relationships: res.data.relationships }
  },
}
