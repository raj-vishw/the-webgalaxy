import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.ts'
import { loadEnv } from '../src/config/env.ts'
import { createDatabase, type DatabaseHandle } from '../src/db/client.ts'
import { adminUsers, universes, websiteRelationships, websites } from '../src/db/schema.ts'
import { tagRepo } from '../src/repositories/tagRepo.ts'
import { hashPassword } from '../src/utils/password.ts'
import { hashString } from '../src/utils/slug.ts'

export const ADMIN = { email: 'admin@test.local', password: 'test-password-123' }

export interface TestApp {
  app: FastifyInstance
  handle: DatabaseHandle
  ids: { ai: string; dev: string; chatgpt: string; claude: string; github: string; gitlab: string }
  close: () => Promise<void>
}

/** Fresh in-memory PostgreSQL, migrated and seeded with a tiny galaxy. */
export async function createTestApp(): Promise<TestApp> {
  const env = loadEnv({ NODE_ENV: 'test', JWT_SECRET: 'test-secret-test-secret-test', DATABASE_URL: '' })
  const handle = await createDatabase({ pgliteDir: 'memory://' })
  await handle.migrate()
  const { db } = handle

  const config = (position: [number, number, number]) => ({
    position,
    scale: 10,
    palette: { core: '#ffffff', primary: '#8fb0ff', secondary: '#c9d7ff' },
    seed: 1,
    layout: { spread: [1, 0.5, 1] as [number, number, number], coreBias: 0.5, energy: 1, dust: 1 },
  })
  const [ai] = await db.insert(universes).values({ slug: 'ai', name: 'AI', description: 'Artificial intelligence', visualType: 'spiral', visualConfig: config([-30, 0, 0]), sortOrder: 0 }).returning()
  const [dev] = await db.insert(universes).values({ slug: 'development', name: 'Development', description: 'Software engineering', visualType: 'stream', visualConfig: config([30, 0, 0]), sortOrder: 1 }).returning()

  const site = (slug: string, name: string, universeId: string, extra: Partial<typeof websites.$inferInsert> = {}) => ({
    slug,
    name,
    url: `https://${slug}.example/`,
    urlNormalized: `${slug}.example`,
    description: `${name} description for testing.`,
    universeId,
    objectType: 'planet',
    importance: 80,
    positionSeed: hashString(slug),
    ...extra,
  })
  const [chatgpt] = await db.insert(websites).values(site('chatgpt', 'ChatGPT', ai.id, { objectType: 'star', importance: 98, isTrending: true, trendingScore: 0.9 })).returning()
  const [claude] = await db.insert(websites).values(site('claude', 'Claude', ai.id, { isEmerging: true, trendingScore: 0.5, importance: 60 })).returning()
  const [github] = await db.insert(websites).values(site('github', 'GitHub', dev.id, { objectType: 'star', importance: 100 })).returning()
  const [gitlab] = await db.insert(websites).values(site('gitlab', 'GitLab', dev.id, { importance: 75 })).returning()
  await tagRepo.setForWebsite(db, chatgpt.id, ['assistant', 'llm'])
  await tagRepo.setForWebsite(db, claude.id, ['assistant', 'llm'])
  await tagRepo.setForWebsite(db, github.id, ['git', 'open-source'])
  await tagRepo.setForWebsite(db, gitlab.id, ['git', 'devops'])
  await db.insert(websiteRelationships).values([
    { sourceWebsiteId: github.id, targetWebsiteId: gitlab.id, type: 'alternative' },
    { sourceWebsiteId: chatgpt.id, targetWebsiteId: claude.id, type: 'alternative' },
    { sourceWebsiteId: github.id, targetWebsiteId: chatgpt.id, type: 'integration', note: 'Cross-universe' },
  ])
  await db.insert(adminUsers).values({ email: ADMIN.email, name: 'Admin', passwordHash: await hashPassword(ADMIN.password) })

  const app = await buildApp({ env, db, rateLimit: false })
  await app.ready()
  return {
    app,
    handle,
    ids: { ai: ai.id, dev: dev.id, chatgpt: chatgpt.id, claude: claude.id, github: github.id, gitlab: gitlab.id },
    close: async () => {
      await app.close()
      await handle.close()
    },
  }
}

export async function login(app: FastifyInstance, who = ADMIN): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: who })
  return res.json().data.token
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` })
