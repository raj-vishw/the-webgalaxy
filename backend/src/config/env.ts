import { resolve } from 'node:path'
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
  DATABASE_URL: z.string().url().optional(),
  PGLITE_DIR: z.string().default('./data/pglite'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-please'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email().default('admin@webgalaxy.local'),
  ADMIN_PASSWORD: z.string().min(8).default('change-me-now'),
  ADMIN_NAME: z.string().default('Galaxy Admin'),
  RATE_LIMIT_GLOBAL: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_SEARCH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_SUBMIT: z.coerce.number().int().positive().default(5),
  // Behind Vercel (or any reverse proxy) the client address arrives in
  // X-Forwarded-For; without this, rate limits would count the proxy instead.
  TRUST_PROXY: z.preprocess((v) => (v === undefined || v === '' ? !!process.env.VERCEL : /^(1|true|yes)$/i.test(String(v))), z.boolean()),
})

export type Env = z.infer<typeof schema>

/**
 * Names under which hosting integrations hand us a PostgreSQL connection
 * string — Vercel Postgres / Supabase (`POSTGRES_*`), Neon (`DATABASE_URL`,
 * `DATABASE_URL_UNPOOLED`), Heroku/Railway (`DATABASE_URL`). The first one
 * present wins; a pooled URL is preferred for a serverless API.
 */
const DATABASE_URL_ALIASES = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL_UNPOOLED'] as const

/**
 * `backend/.env` (git-ignored) is read on first use; variables already in the
 * process environment always win, so a deployment's settings are never
 * overridden by a stray file.
 */
let envFileLoaded = false
function loadEnvFile() {
  if (envFileLoaded) return
  envFileLoaded = true
  try {
    process.loadEnvFile(resolve(import.meta.dirname, '../../.env'))
  } catch {
    // no .env file — fine
  }
}

export function loadEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  loadEnvFile()
  const source: Record<string, string | undefined> = { ...process.env, ...overrides }
  // A variable set to an empty string (a blank row in a hosting dashboard,
  // a pasted .env.example) means "not set": the default applies.
  for (const key of Object.keys(source)) if (source[key] !== undefined && source[key]!.trim() === '') delete source[key]
  if (!source.DATABASE_URL) source.DATABASE_URL = DATABASE_URL_ALIASES.map((name) => source[name]).find((v) => v && v.trim())
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  const env = parsed.data
  if (env.NODE_ENV === 'production') {
    // Report everything that is missing at once, so one deploy fixes it.
    const problems: string[] = []
    if (!env.DATABASE_URL) problems.push('DATABASE_URL must be set (a PostgreSQL connection string; POSTGRES_URL from a Vercel/Supabase/Neon integration also works)')
    if (env.JWT_SECRET === 'dev-only-secret-change-me-please') problems.push('JWT_SECRET must be set')
    if (env.ADMIN_PASSWORD === 'change-me-now') problems.push('ADMIN_PASSWORD must be changed')
    if (problems.length) throw new Error(`${problems.join('; ')} — set these environment variables in production`)
  }
  return env
}

/**
 * Origins allowed to call the API cross-site: the configured list plus the
 * deployment's own Vercel URLs, so previews work without per-deployment
 * configuration. Same-origin requests are allowed separately (see app.ts).
 */
export const corsOrigins = (env: Env) => {
  const configured = env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) configured.push(`https://${host}`)
  }
  return configured
}
