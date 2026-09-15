import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../backend/src/app.js'
import { loadEnv } from '../backend/src/config/env.js'
import { createDatabase } from '../backend/src/db/client.js'
import { authService } from '../backend/src/services/authService.js'
import { TtlCache } from '../backend/src/utils/cache.js'

/**
 * Vercel entry point: every `/api/*` request is rewritten to this one Node.js
 * Function (see vercel.json), which hands it to the same Fastify app that
 * `backend/src/server.ts` runs as a conventional process.
 *
 * The promise is shared by warm invocations, so migrations, the connection
 * pool and the administrator check happen once per function instance rather
 * than once per request. A failed cold start is forgotten so the next
 * invocation retries instead of serving the same error forever.
 */
let appPromise: Promise<FastifyInstance> | undefined

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const env = loadEnv()
      const database = await createDatabase({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR })
      await database.migrate()
      const app = await buildApp({ env, db: database.db })
      await authService.ensureAdmin({ db: database.db, env, cache: new TtlCache(), log: app.log })
      await app.ready()
      return app
    })().catch((error: unknown) => {
      appPromise = undefined
      throw error
    })
  }
  return appPromise
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const app = await getApp()
  app.server.emit('request', request, response)
}
