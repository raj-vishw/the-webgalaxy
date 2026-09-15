import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Actor } from '../context.js'
import { forbidden, unauthorized } from '../utils/errors.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: Actor
    user: Actor
  }
}

/** preHandler: a valid admin JWT is required. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    request.log.warn({ path: request.url }, 'authentication failed')
    throw unauthorized()
  }
}

/** preHandler factory: the authenticated user must hold one of the roles. */
export function requireRole(...roles: Actor['role'][]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (!roles.includes(request.user.role)) {
      request.log.warn({ actor: request.user.email, path: request.url, needed: roles }, 'authorization denied')
      throw forbidden()
    }
  }
}
