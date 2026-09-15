import { z } from 'zod'

/**
 * Environment, validated once at startup. Secrets only ever come from here;
 * nothing in this file has defaults that would be safe in production for
 * `JWT_SECRET` or the admin password — `NODE_ENV=production` refuses them.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  PGLITE_DIR: z.string().default('./data/pglite'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-please'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email().default('admin@webgalaxy.local'),
  ADMIN_PASSWORD: z.string().min(8).default('change-me-now'),
  ADMIN_NAME: z.string().default('Galaxy Admin'),
  RATE_LIMIT_GLOBAL: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_SEARCH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_SUBMIT: z.coerce.number().int().positive().default(5),
  TRUST_PROXY: z.coerce.boolean().default(false),
})

export type Env = z.infer<typeof schema>

export function loadEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  const parsed = schema.safeParse({ ...process.env, ...overrides })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  const env = parsed.data
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'dev-only-secret-change-me-please') throw new Error('JWT_SECRET must be set in production')
    if (env.ADMIN_PASSWORD === 'change-me-now') throw new Error('ADMIN_PASSWORD must be changed in production')
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set in production')
  }
  return env
}

export const corsOrigins = (env: Env) =>
  env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
