/**
 * Admin HTTP client. Sends the session JWT, unwraps the API envelope and
 * turns failures into `ApiError`s. The token lives in sessionStorage so it
 * dies with the tab.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api'
const TOKEN_KEY = 'webgalaxy.admin.token'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: { path: string; message: string }[]
  constructor(status: number, code: string, message: string, details?: { path: string; message: string }[]) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const token = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (value: string) => sessionStorage.setItem(TOKEN_KEY, value),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const listeners = new Set<() => void>()
/** Fires when a request comes back 401 so the app can return to the login screen. */
export const onUnauthorized = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {}): Promise<{ data: T; pagination?: Pagination }> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(options.query ?? {})) if (v !== undefined && v !== '') params.set(k, String(v))
  const qs = params.toString()
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token.get() ? { authorization: `Bearer ${token.get()}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.success) {
    if (res.status === 401) {
      token.clear()
      listeners.forEach((fn) => fn())
    }
    throw new ApiError(res.status, payload?.error?.code ?? `HTTP_${res.status}`, payload?.error?.message ?? `Request failed (${res.status})`, payload?.error?.details)
  }
  return { data: payload.data as T, pagination: payload.pagination }
}
