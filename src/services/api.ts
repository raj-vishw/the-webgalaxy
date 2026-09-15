/**
 * The one HTTP client of the public galaxy. Every API module goes through
 * `request()`, which knows the base URL, the response envelope, timeouts and
 * how to turn failures into `ApiError`s. Components never call `fetch`.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api'

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiEnvelope<T> {
  success: true
  data: T
  pagination?: ApiPagination
}

export interface ApiFailure {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Network-level or 5xx problems: the backend itself is unavailable. */
  get isUnavailable() {
    return this.status === 0 || this.status >= 500
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  /** Milliseconds before the request is abandoned. */
  timeout?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), options.timeout ?? 12_000)
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: { accept: 'application/json', ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}), ...options.headers },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    window.clearTimeout(timer)
    if (options.signal?.aborted) throw new ApiError(0, 'ABORTED', 'The request was cancelled.')
    throw new ApiError(0, 'NETWORK', error instanceof Error && error.name === 'AbortError' ? 'The galaxy took too long to answer.' : 'The galaxy could not be reached.')
  }
  window.clearTimeout(timer)

  let payload: ApiEnvelope<T> | ApiFailure | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T> | ApiFailure
  } catch {
    payload = null
  }
  if (!response.ok || !payload || !payload.success) {
    const failure = payload && !payload.success ? payload.error : null
    throw new ApiError(response.status, failure?.code ?? `HTTP_${response.status}`, failure?.message ?? `Request failed (${response.status}).`, failure?.details)
  }
  return payload
}

/** Follows `pagination` until every page is collected (bounded). */
export async function requestAll<T>(path: string, query: RequestOptions['query'] = {}, limit = 200, maxPages = 25): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const res = await request<T[]>(path, { query: { ...query, page, limit } })
    out.push(...res.data)
    if (!res.pagination || page >= res.pagination.totalPages) break
  }
  return out
}
