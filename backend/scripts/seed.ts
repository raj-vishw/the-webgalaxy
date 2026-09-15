/**
 * `npm run db:seed [-- --reset]`
 *
 * Migrates the Phase 1–5 demo data into the database: universes, websites,
 * tags, relationships and the static trend snapshot — read from the
 * frontend's `src/data/*.ts` so there is exactly one copy of the catalogue.
 * Upserts by slug, so re-running refreshes the seeded rows without touching
 * content added through the admin. `--reset` truncates everything first.
 */
import { sql } from 'drizzle-orm'
import { relationships as seedRelationships } from '../../src/data/relationships.ts'
import { TRENDING_THRESHOLD, trends } from '../../src/data/trends.ts'
import { universes as seedUniverses } from '../../src/data/universes.ts'
import { websites as seedWebsites } from '../../src/data/websites.ts'
import { loadEnv } from '../src/config/env.ts'
import { createDatabase } from '../src/db/client.ts'
import { adminAuditLog, adminUsers, submissions, tags, universes, websiteRelationships, websiteTags, websites } from '../src/db/schema.ts'
import { tagRepo } from '../src/repositories/tagRepo.ts'
import { authService } from '../src/services/authService.ts'
import { TtlCache } from '../src/utils/cache.ts'
import { hashString } from '../src/utils/slug.ts'
import { parseWebsiteUrl } from '../src/utils/url.ts'

const reset = process.argv.includes('--reset')
const env = loadEnv()
const handle = await createDatabase({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR })
const { db } = handle
await handle.migrate()

const log = (msg: string, extra: Record<string, unknown> = {}) => console.log(`[seed] ${msg}`, Object.keys(extra).length ? extra : '')

if (reset) {
  for (const table of [adminAuditLog, submissions, websiteRelationships, websiteTags, websites, tags, universes, adminUsers]) {
    await db.delete(table)
  }
  log('reset: all tables emptied')
}

// ─── Universes ───────────────────────────────────────────────────────────────
const universeIds = new Map<string, string>()
for (const [index, u] of seedUniverses.entries()) {
  const [row] = await db
    .insert(universes)
    .values({
      slug: u.id,
      name: u.name,
      description: u.description,
      visualType: u.visualType,
      visualConfig: { position: [u.position[0], u.position[1], u.position[2]], scale: u.scale, palette: { ...u.palette }, seed: u.seed, layout: { ...u.layout, spread: [u.layout.spread[0], u.layout.spread[1], u.layout.spread[2]] } },
      sortOrder: index,
    })
    .onConflictDoUpdate({
      target: universes.slug,
      set: {
        name: u.name,
        description: u.description,
        visualType: u.visualType,
        visualConfig: sql`excluded.visual_config`,
        sortOrder: index,
        updatedAt: new Date(),
      },
    })
    .returning()
  universeIds.set(u.id, row.id)
}
log('universes', { count: universeIds.size })

// ─── Websites (two passes: rows, then moon anchors) ──────────────────────────
const trendBySlug = new Map(trends.map((t) => [t.websiteId, t]))
const websiteIds = new Map<string, string>()
for (const w of seedWebsites) {
  const universeId = universeIds.get(w.universeId)
  if (!universeId) {
    log('skip website with unknown universe', { slug: w.id })
    continue
  }
  const trend = trendBySlug.get(w.id)
  const parsed = w.url ? parseWebsiteUrl(w.url) : null
  const values = {
    slug: w.id,
    name: w.name,
    url: parsed?.href ?? null,
    urlNormalized: parsed?.normalized ?? null,
    description: w.description ?? '',
    universeId,
    objectType: w.objectType,
    importance: Math.round(w.importance ?? 50),
    popularityScore: Math.round(w.importance ?? 50),
    trendingScore: trend?.trendingScore ?? 0,
    trendDirection: trend?.trendDirection ?? 'steady',
    isTrending: !!trend && !trend.emerging && trend.trendingScore >= TRENDING_THRESHOLD,
    isEmerging: !!trend?.emerging,
    accent: w.accent ?? null,
    glyph: w.glyph ?? null,
    positionSeed: hashString(w.id),
  }
  const [row] = await db
    .insert(websites)
    .values(values)
    .onConflictDoUpdate({ target: websites.slug, set: { ...values, updatedAt: new Date() } })
    .returning()
  websiteIds.set(w.id, row.id)
  await tagRepo.setForWebsite(db, row.id, w.tags ?? [])
}
for (const w of seedWebsites) {
  if (!w.orbitAnchorId) continue
  const id = websiteIds.get(w.id)
  const anchorId = websiteIds.get(w.orbitAnchorId)
  if (id && anchorId && id !== anchorId) await db.update(websites).set({ orbitAnchorId: anchorId }).where(sql`${websites.id} = ${id}`)
}
log('websites', { count: websiteIds.size })

// ─── Relationships (inline + shared; invalid entries are reported and skipped) ─
const declared = [
  ...seedWebsites.flatMap((w) => (w.relationships ?? []).map((r) => ({ source: w.id, ...r }))),
  ...seedRelationships,
]
let inserted = 0
const skipped: string[] = []
for (const r of declared) {
  const source = websiteIds.get(r.source)
  const target = websiteIds.get(r.target)
  if (!source || !target || source === target) {
    skipped.push(`${r.source} → ${r.target} (${!source || !target ? 'unknown website' : 'self'})`)
    continue
  }
  const rows = await db
    .insert(websiteRelationships)
    .values({ sourceWebsiteId: source, targetWebsiteId: target, type: r.type, directed: !!r.directed, note: r.note ?? null, strength: 1 })
    .onConflictDoNothing()
    .returning()
  if (rows.length) inserted++
  else skipped.push(`${r.source} → ${r.target} (duplicate)`)
}
log('relationships', { inserted, skipped: skipped.length })
if (skipped.length) log('skipped relationships: ' + skipped.join(', '))

// ─── First administrator ─────────────────────────────────────────────────────
const ctx = { db, env, cache: new TtlCache(), log: console as never }
const admin = await authService.ensureAdmin(ctx)
log(`administrator ${admin} (the only account)`, { email: env.ADMIN_EMAIL })

await handle.close()
log(`done (${handle.kind})`)
