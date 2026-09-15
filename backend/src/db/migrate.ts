import { loadEnv } from '../config/env.js'
import { createDatabase } from './client.js'

/** `npm run db:migrate` — apply pending migrations to the configured database. */
const env = loadEnv()
const handle = await createDatabase({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR })
await handle.migrate()
console.log(`[db] migrations applied (${handle.kind})`)
await handle.close()
