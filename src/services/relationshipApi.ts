import { request, requestAll } from './api'
import { mapRelationship } from './api/mappers'
import type { ApiRelationship } from './api/types'

export const relationshipApi = {
  /** The whole graph, lightweight — a few hundred rows at most. */
  async listAll() {
    const rows = await requestAll<ApiRelationship>('/relationships', {}, 500)
    return rows.map(mapRelationship)
  },
  async forWebsite(idOrSlug: string, kind: 'relationships' | 'related' | 'alternatives' | 'integrations' = 'relationships') {
    const res = await request<ApiRelationship[]>(`/websites/${encodeURIComponent(idOrSlug)}/${kind}`)
    return res.data.map(mapRelationship)
  },
}
