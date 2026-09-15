/** Every response has the same envelope, success or failure. */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const ok = <T>(data: T, extra: Record<string, unknown> = {}) => ({ success: true as const, data, ...extra })

export const paginated = <T>(data: T[], pagination: Pagination) => ({ success: true as const, data, pagination })

export const fail = (code: string, message: string, details?: unknown) => ({
  success: false as const,
  error: details === undefined ? { code, message } : { code, message, details },
})

export function paginationFor(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}
