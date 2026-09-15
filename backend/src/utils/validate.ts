import type { z } from 'zod'
import { badRequest } from './errors.js'

/** Parses with a Zod schema or throws a 400 with the field issues. */
export function validate<T extends z.ZodTypeAny>(schema: T, value: unknown, what = 'request'): z.infer<T> {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
  throw badRequest('VALIDATION_ERROR', `Invalid ${what}.`, details)
}
