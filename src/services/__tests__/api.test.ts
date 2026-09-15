import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildUrl, request, requestAll } from '../api'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('api client', () => {
  afterEach(() => vi.restoreAllMocks())

  it('builds URLs under the API base and drops empty query values', () => {
    expect(buildUrl('/websites', { page: 1, universe: undefined, tag: '', trending: true })).toBe('/api/websites?page=1&trending=true')
    expect(buildUrl('search')).toBe('/api/search')
  })

  it('unwraps the success envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ success: true, data: { id: 'x' } }))
    const res = await request<{ id: string }>('/websites/x')
    expect(res.data.id).toBe('x')
  })

  it('turns API failures into ApiError with the server code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ success: false, error: { code: 'WEBSITE_NOT_FOUND', message: 'nope' } }, 404))
    await expect(request('/websites/x')).rejects.toMatchObject({ name: 'ApiError', status: 404, code: 'WEBSITE_NOT_FOUND', message: 'nope' })
  })

  it('turns network failures into an unavailable ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const error = (await request('/universes').catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.isUnavailable).toBe(true)
  })

  it('treats non-JSON 5xx responses as unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 502 }))
    const error = (await request('/universes').catch((e) => e)) as ApiError
    expect(error.status).toBe(502)
    expect(error.isUnavailable).toBe(true)
  })

  it('follows pagination until the last page', async () => {
    const pages = [
      { success: true, data: [1, 2], pagination: { page: 1, limit: 2, total: 3, totalPages: 2 } },
      { success: true, data: [3], pagination: { page: 2, limit: 2, total: 3, totalPages: 2 } },
    ]
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(pages.shift()))
    expect(await requestAll<number>('/websites', {}, 2)).toEqual([1, 2, 3])
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
