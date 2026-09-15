import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import { corsOrigins, type Env } from './config/env.js'
import type { Database } from './db/client.js'
import type { AppContext } from './context.js'
import { registerErrorHandler } from './middleware/errorHandler.js'
import { adminRoutes } from './routes/admin.js'
import { healthRoutes } from './routes/health.js'
import { publicRoutes } from './routes/public.js'
import { TtlCache } from './utils/cache.js'
import { AppError } from './utils/errors.js'

export interface BuildOptions {
  env: Env
  db: Database
  /** Disables rate limiting (tests). */
  rateLimit?: boolean
}

/**
 * Builds the Fastify app without listening, so tests can drive it with
 * `app.inject`. Security middleware is unconditional: helmet headers, CORS
 * restricted to configured origins, rate limits on public routes, JWT for
 * anything administrative.
 */
export async function buildApp({ env, db, rateLimit: withRateLimit = true }: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
            ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } } : {}),
          },
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
  })

  const ctx: AppContext = { db, env, cache: new TtlCache(), log: app.log }

  await app.register(helmet, { contentSecurityPolicy: false })
  const localhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
  await app.register(cors, {
    origin: (origin, cb) => {
      // Same-origin / server-to-server requests carry no Origin header;
      // any localhost port is fine outside production.
      if (!origin || corsOrigins(env).includes(origin) || (env.NODE_ENV !== 'production' && localhost.test(origin))) return cb(null, true)
      cb(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This origin may not call the API.'), false)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  await app.register(jwt, { secret: env.JWT_SECRET })
  if (withRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: env.RATE_LIMIT_GLOBAL,
      timeWindow: '1 minute',
      allowList: (request) => request.url.startsWith('/health'),
    })
  }

  registerErrorHandler(app)

  app.addHook('onResponse', (request, reply, done) => {
    if (reply.statusCode >= 400 && env.NODE_ENV !== 'test') {
      request.log.warn({ method: request.method, url: request.url, status: reply.statusCode }, 'request failed')
    }
    done()
  })

  await app.register(healthRoutes, ctx)
  await app.register(async (api) => {
    await api.register(publicRoutes, ctx)
    await api.register(async (admin) => adminRoutes(admin, ctx), { prefix: '/admin' })
  }, { prefix: '/api' })

  return app
}
