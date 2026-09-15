import { loadEnv } from './config/env.js'
import { createDatabase } from './db/client.js'
import { buildApp } from './app.js'

/** Entry point: migrate, build, listen, and shut down cleanly on signals. */
const env = loadEnv()
const handle = await createDatabase({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR })
await handle.migrate()
const app = await buildApp({ env, db: handle.db })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  await handle.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port: env.PORT, host: env.HOST })
  app.log.info({ database: handle.kind }, 'The WebGalaxy API is up')
} catch (error) {
  app.log.error({ err: error }, 'failed to start')
  process.exit(1)
}
