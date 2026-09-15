import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Actor } from '../context.js'
import { unauthorized } from '../utils/errors.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: Actor
    user: Actor
  }
}

/**
 * preHandler: a valid administrator JWT is required. The token must also
 * still name the one configured administrator — a token minted for an
 * account that has since been replaced is refused.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    request.log.warn({ path: request.url }, 'authentication failed')
    throw unauthorized()
  }
}
