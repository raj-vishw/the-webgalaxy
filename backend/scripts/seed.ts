/**
 * `npm run db:seed [-- --reset [--yes]]`
 *
 * Migrates the bundled catalogue into the database: universes, websites
 * (curated + directory import), tags, relationships and the static trend
 * snapshot — read from the frontend's `src/data/*.ts` so there is exactly
 * one copy of the catalogue.
 * Upserts by slug, so re-running refreshes the seeded rows without touching
 * content added through the admin. `--reset` truncates everything first.
 */
import { inArray, sql } from 'drizzle-orm'
import { directoryRelationships, directoryWebsites } from '../../src/data/directory.ts'
import { relationships as curatedRelationships } from '../../src/data/relationships.ts'
import { TRENDING_THRESHOLD, trends } from '../../src/data/trends.ts'
import { universes as seedUniverses } from '../../src/data/universes.ts'
import { websites as curatedWebsites } from '../../src/data/websites.ts'
import { loadEnv } from '../src/config/env.ts'
import { createDatabase } from '../src/db/client.ts'
import { adminAuditLog, adminUsers, submissions, tags, universes, websiteRelationships, websiteTags, websites } from '../src/db/schema.ts'
import { tagRepo } from '../src/repositories/tagRepo.ts'
import { authService } from '../src/services/authService.ts'
import { TtlCache } from '../src/utils/cache.ts'
import { hashString, slugify } from '../src/utils/slug.ts'
import { parseWebsiteUrl } from '../src/utils/url.ts'

const reset = process.argv.includes('--reset')
const confirmed = process.argv.includes('--yes')
/** Curated entries first: they win over a directory import of the same slug. */
const seedWebsites = [...curatedWebsites, ...directoryWebsites]
const seedRelationships = [...curatedRelationships, ...directoryRelationships]
const env = loadEnv()
const handle = await createDatabase({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR })
const { db } = handle
await handle.migrate()

const log = (msg: string, extra: Record<string, unknown> = {}) => console.log(`[seed] ${msg}`, Object.keys(extra).length ? extra : '')

if (reset && handle.kind === 'postgres' && !confirmed) {
  // `backend/.env` may point at a hosted database: never wipe one by accident.
  console.error('[seed] --reset would empty a remote PostgreSQL database; re-run with --yes if that is intended.')
  await handle.close()
  process.exit(1)
}
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

// ─── Websites (batched: a hosted database is hundreds of milliseconds away) ─
const CHUNK = 200
const chunks = <T>(list: T[], size = CHUNK): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))
const trendBySlug = new Map(trends.map((t) => [t.websiteId, t]))
const rowsToSeed = seedWebsites.flatMap((w) => {
  const universeId = universeIds.get(w.universeId)
  if (!universeId) {
    log('skip website with unknown universe', { slug: w.id })
    return []
  }
  const trend = trendBySlug.get(w.id)
  const parsed = w.url ? parseWebsiteUrl(w.url) : null
  return [
    {
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
      topic: w.topic ?? null,
      positionSeed: hashString(w.id),
    },
  ]
})

// The same URL under a different slug (a regenerated import renamed it):
// carry the existing row over to the new slug rather than tripping the
// unique index. One read, then only the handful of real renames.
const existing = await db.select({ slug: websites.slug, urlNormalized: websites.urlNormalized }).from(websites)
const slugByUrl = new Map(existing.filter((r) => r.urlNormalized).map((r) => [r.urlNormalized!, r.slug]))
let renamed = 0
for (const r of rowsToSeed) {
  const current = r.urlNormalized ? slugByUrl.get(r.urlNormalized) : undefined
  if (!current || current === r.slug) continue
  await db.update(websites).set({ slug: r.slug }).where(sql`${websites.urlNormalized} = ${r.urlNormalized} and ${websites.slug} <> ${r.slug}`)
  renamed++
}
if (renamed) log('renamed rows whose URL moved to a new slug', { renamed })

const websiteIds = new Map<string, string>()
for (const chunk of chunks(rowsToSeed)) {
  const rows = await db
    .insert(websites)
    .values(chunk)
    .onConflictDoUpdate({
      target: websites.slug,
      set: {
        name: sql`excluded.name`,
        url: sql`excluded.url`,
        urlNormalized: sql`excluded.url_normalized`,
        description: sql`excluded.description`,
        universeId: sql`excluded.universe_id`,
        objectType: sql`excluded.object_type`,
        importance: sql`excluded.importance`,
        popularityScore: sql`excluded.popularity_score`,
        trendingScore: sql`excluded.trending_score`,
        trendDirection: sql`excluded.trend_direction`,
        isTrending: sql`excluded.is_trending`,
        isEmerging: sql`excluded.is_emerging`,
        accent: sql`excluded.accent`,
        glyph: sql`excluded.glyph`,
        topic: sql`excluded.topic`,
        positionSeed: sql`excluded.position_seed`,
        updatedAt: new Date(),
      },
    })
    .returning()
  for (const row of rows) websiteIds.set(row.slug, row.id)
}

// Moon anchors, once every row has an id.
const anchors = seedWebsites.flatMap((w) => {
  const id = websiteIds.get(w.id)
  const anchorId = w.orbitAnchorId ? websiteIds.get(w.orbitAnchorId) : null
  return id ? [{ id, anchorId: anchorId && anchorId !== id ? anchorId : null }] : []
})
for (const chunk of chunks(anchors, 500)) {
  const values = sql.join(
    chunk.map((a) => sql`(${a.id}::uuid, ${a.anchorId}::uuid)`),
    sql`, `,
  )
  await db.execute(sql`update ${websites} set orbit_anchor_id = v.anchor from (values ${values}) as v(id, anchor) where ${websites.id} = v.id`)
}

// Tags: create the whole vocabulary at once, then relink the seeded websites.
const allTags = await tagRepo.ensure(db, [...new Set(seedWebsites.flatMap((w) => w.tags ?? []))])
const tagIdBySlug = new Map(allTags.map((t) => [t.slug, t.id]))
const links = seedWebsites.flatMap((w) => {
  const websiteId = websiteIds.get(w.id)
  if (!websiteId) return []
  const ids = new Set((w.tags ?? []).map((n) => tagIdBySlug.get(slugify(n))).filter((id): id is string => !!id))
  return [...ids].map((tagId) => ({ websiteId, tagId }))
})
for (const chunk of chunks([...websiteIds.values()], 500)) await db.delete(websiteTags).where(inArray(websiteTags.websiteId, chunk))
for (const chunk of chunks(links, 1000)) await db.insert(websiteTags).values(chunk).onConflictDoNothing()
log('websites', { count: websiteIds.size, tags: allTags.length })

// ─── Relationships (inline + shared; invalid entries are reported and skipped) ─
const declared = [
  ...seedWebsites.flatMap((w) => (w.relationships ?? []).map((r) => ({ source: w.id, ...r }))),
  ...seedRelationships,
]
let inserted = 0
const skipped: string[] = []
const valid: (typeof websiteRelationships.$inferInsert & { label: string })[] = []
for (const r of declared) {
  const source = websiteIds.get(r.source)
  const target = websiteIds.get(r.target)
  if (!source || !target || source === target) {
    skipped.push(`${r.source} → ${r.target} (${!source || !target ? 'unknown website' : 'self'})`)
    continue
  }
  valid.push({ label: `${r.source} → ${r.target}`, sourceWebsiteId: source, targetWebsiteId: target, type: r.type, directed: !!r.directed, note: r.note ?? null, strength: 1 })
}
for (const chunk of chunks(valid, 500)) {
  // A batch may repeat a pair (declared from both sides): insert those one by
  // one so the whole chunk is not refused for "affecting a row twice".
  const seen = new Set<string>()
  const unique: typeof chunk = []
  for (const r of chunk) {
    const key = [r.sourceWebsiteId, r.targetWebsiteId].sort().join('|') + r.type
    if (seen.has(key)) skipped.push(`${r.label} (declared twice)`)
    else {
      seen.add(key)
      unique.push(r)
    }
  }
  const rows = await db
    .insert(websiteRelationships)
    .values(unique.map(({ label: _, ...r }) => r))
    .onConflictDoNothing()
    .returning()
  inserted += rows.length
  if (rows.length < unique.length) skipped.push(`${unique.length - rows.length} already present`)
}
log('relationships', { inserted, skipped: skipped.length })
if (skipped.length) log('skipped relationships: ' + skipped.join(', '))

// ─── First administrator ─────────────────────────────────────────────────────
const ctx = { db, env, cache: new TtlCache(), log: console as never }
const admin = await authService.ensureAdmin(ctx)
log(`administrator ${admin} (the only account)`, { email: env.ADMIN_EMAIL })

await handle.close()
log(`done (${handle.kind})`)
