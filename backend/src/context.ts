import type { FastifyBaseLogger } from 'fastify'
import type { Env } from './config/env.js'
import type { Database } from './db/client.js'
import type { TtlCache } from './utils/cache.js'

/** Everything a service needs, threaded explicitly — no globals, easy to test. */
export interface AppContext {
  db: Database
  env: Env
  cache: TtlCache
  log: FastifyBaseLogger
}

/** Who performed an administrative action. */
export interface Actor {
  id: string
  email: string
  role: 'admin' | 'editor'
}
