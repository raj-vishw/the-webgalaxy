import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import * as schema from './schema.js'

/**
 * One database handle for the whole process. A real PostgreSQL server when
 * `DATABASE_URL` is set; otherwise an embedded PostgreSQL (PGlite) on disk —
 * or in memory for tests — so development and CI need no extra services.
 * Every repository talks to `Database`, never to a driver.
 */
export type Database = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>

export interface DatabaseHandle {
  db: Database
  kind: 'postgres' | 'pglite'
  /** Applies pending migrations from ./drizzle. */
  migrate: () => Promise<void>
  close: () => Promise<void>
}

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle')

export interface DatabaseOptions {
  databaseUrl?: string
  /** PGlite data directory, or 'memory://' for an ephemeral database. */
  pgliteDir?: string
}

/**
 * Hosted PostgreSQL almost always requires TLS. When the URL says nothing
 * about it (no `sslmode` / `ssl` parameter) and the host is not local, TLS is
 * switched on without certificate pinning; a URL with `sslmode=verify-full`
 * keeps strict verification.
 */
function sslFor(databaseUrl: string): pg.PoolConfig['ssl'] {
  try {
    const url = new URL(databaseUrl)
    if (url.searchParams.has('sslmode') || url.searchParams.has('ssl')) return undefined
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|db|postgres)$/.test(url.hostname)
    return local ? undefined : { rejectUnauthorized: false }
  } catch {
    return undefined
  }
}

export async function createDatabase(options: DatabaseOptions): Promise<DatabaseHandle> {
  if (options.databaseUrl) {
    const pool = new pg.Pool({ connectionString: options.databaseUrl, ssl: sslFor(options.databaseUrl), max: 10, idleTimeoutMillis: 30_000 })
    const db = drizzlePg(pool, { schema })
    return {
      db,
      kind: 'postgres',
      migrate: () => migratePg(db, { migrationsFolder }),
      close: () => pool.end(),
    }
  }
  const dir = options.pgliteDir ?? 'memory://'
  if (dir !== 'memory://') await mkdir(dir, { recursive: true })
  const client = new PGlite(dir === 'memory://' ? undefined : dir)
  await client.waitReady
  const db = drizzlePglite(client, { schema })
  return {
    db,
    kind: 'pglite',
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  }
}
