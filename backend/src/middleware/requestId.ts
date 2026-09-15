import { createHash } from 'node:crypto'
import type { FastifyRequest } from 'fastify'

/** Stable, non-reversible token for a client address (abuse review without storing IPs). */
export function clientHash(request: FastifyRequest, secret: string): string {
  return createHash('sha256').update(`${secret}:${request.ip}`).digest('hex').slice(0, 32)
}
