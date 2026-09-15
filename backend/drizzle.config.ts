import { defineConfig } from 'drizzle-kit'

/** Migration generation only; the runtime picks its driver in `src/db/client.ts`. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/webgalaxy' },
})
