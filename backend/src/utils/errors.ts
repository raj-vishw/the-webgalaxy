/**
 * Application errors carry an HTTP status and a stable machine-readable code.
 * Anything else that reaches the error handler is reported as a generic
 * 500 — internals never leak to clients.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const notFound = (code: string, message: string) => new AppError(404, code, message)
export const badRequest = (code: string, message: string, details?: unknown) => new AppError(400, code, message, details)
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details)
export const unauthorized = (message = 'Authentication required.') => new AppError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'You do not have permission to do that.') => new AppError(403, 'FORBIDDEN', message)
