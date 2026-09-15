import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../context.js'

export async function healthRoutes(app: FastifyInstance, ctx: AppContext) {
  /** Liveness: the process is up. */
  app.get('/health', async () => ({ status: 'ok' }))

  /** Readiness: the database answers. */
  app.get('/health/ready', async (_request, reply) => {
    try {
      await ctx.db.execute(sql`select 1`)
      return { status: 'ok', database: 'ok' }
    } catch (error) {
      ctx.log.error({ err: error }, 'readiness check failed')
      reply.status(503)
      return { status: 'degraded', database: 'unavailable' }
    }
  })
}
