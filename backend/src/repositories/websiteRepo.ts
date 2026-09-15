import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '../db/client.js'
import { tags, universes, websiteTags, websites, type WebsiteRow } from '../db/schema.js'
import { tagRepo } from './tagRepo.js'

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** A website with the joined identifiers the API exposes. */
export interface WebsiteRecord extends WebsiteRow {
  universeSlug: string
  universeName: string
  anchorSlug: string | null
  tags: string[]
}

export interface WebsiteFilters {
  universe?: string
  type?: string
  trending?: boolean
  emerging?: boolean
  tag?: string
  q?: string
  includeInactive?: boolean
  ids?: string[]
}

const anchor = alias(websites, 'anchor')

const baseSelect = (db: Database) =>
  db
    .select({
      website: websites,
      universeSlug: universes.slug,
      universeName: universes.name,
      anchorSlug: anchor.slug,
    })
    .from(websites)
    .innerJoin(universes, eq(universes.id, websites.universeId))
    .leftJoin(anchor, eq(anchor.id, websites.orbitAnchorId))

type Joined = { website: WebsiteRow; universeSlug: string; universeName: string; anchorSlug: string | null }

async function attachTags(db: Database, rows: Joined[]): Promise<WebsiteRecord[]> {
  const tagMap = await tagRepo.forWebsites(
    db,
    rows.map((r) => r.website.id),
  )
  return rows.map((r) => ({
    ...r.website,
    universeSlug: r.universeSlug,
    universeName: r.universeName,
    anchorSlug: r.anchorSlug,
    tags: tagMap.get(r.website.id) ?? [],
  }))
}

function whereFor(f: WebsiteFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = []
  if (!f.includeInactive) clauses.push(eq(websites.isActive, true), eq(universes.isActive, true))
  if (f.universe) clauses.push(isUuid(f.universe) ? eq(universes.id, f.universe) : eq(universes.slug, f.universe))
  if (f.type) clauses.push(eq(websites.objectType, f.type))
  if (f.trending !== undefined) clauses.push(eq(websites.isTrending, f.trending))
  if (f.emerging !== undefined) clauses.push(eq(websites.isEmerging, f.emerging))
  if (f.ids) clauses.push(inArray(websites.id, f.ids.length ? f.ids : ['00000000-0000-0000-0000-000000000000']))
  if (f.tag) {
    clauses.push(
      sql`exists (select 1 from ${websiteTags} join ${tags} on ${tags.id} = ${websiteTags.tagId} where ${websiteTags.websiteId} = ${websites.id} and ${tags.slug} = ${f.tag})`,
    )
  }
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    clauses.push(
      or(
        ilike(websites.name, like),
        ilike(websites.description, like),
        ilike(universes.name, like),
        sql`exists (select 1 from ${websiteTags} join ${tags} on ${tags.id} = ${websiteTags.tagId} where ${websiteTags.websiteId} = ${websites.id} and ${tags.slug} ilike ${like})`,
      ),
    )
  }
  const active = clauses.filter((c): c is SQL => !!c)
  return active.length ? and(...active) : undefined
}

export const websiteRepo = {
  async list(db: Database, filters: WebsiteFilters, page: number, limit: number): Promise<{ rows: WebsiteRecord[]; total: number }> {
    const where = whereFor(filters)
    const [{ n }] = await db
      .select({ n: count() })
      .from(websites)
      .innerJoin(universes, eq(universes.id, websites.universeId))
      .where(where)
    const rows = await baseSelect(db)
      .where(where)
      .orderBy(desc(websites.importance), asc(websites.name))
      .limit(limit)
      .offset((page - 1) * limit)
    return { rows: await attachTags(db, rows), total: Number(n) }
  },

  /** Every matching website, unpaginated — for search candidates and graphs; bounded by `max`. */
  async all(db: Database, filters: WebsiteFilters, max = 2000): Promise<WebsiteRecord[]> {
    const rows = await baseSelect(db).where(whereFor(filters)).orderBy(desc(websites.importance), asc(websites.name)).limit(max)
    return attachTags(db, rows)
  },

  async find(db: Database, idOrSlug: string, includeInactive = false): Promise<WebsiteRecord | null> {
    const match = isUuid(idOrSlug) ? or(eq(websites.id, idOrSlug), eq(websites.slug, idOrSlug)) : eq(websites.slug, idOrSlug)
    const rows = await baseSelect(db)
      .where(includeInactive ? match : and(match, eq(websites.isActive, true)))
      .limit(1)
    const [record] = await attachTags(db, rows)
    return record ?? null
  },

  async findByNormalizedUrl(db: Database, normalized: string): Promise<WebsiteRecord | null> {
    const rows = await baseSelect(db).where(eq(websites.urlNormalized, normalized)).limit(1)
    const [record] = await attachTags(db, rows)
    return record ?? null
  },

  async slugExists(db: Database, slug: string): Promise<boolean> {
    const [row] = await db.select({ n: count() }).from(websites).where(eq(websites.slug, slug))
    return Number(row?.n ?? 0) > 0
  },

  async create(db: Database, data: typeof websites.$inferInsert, tagNames: string[]): Promise<WebsiteRecord> {
    const [row] = await db.insert(websites).values(data).returning()
    await tagRepo.setForWebsite(db, row.id, tagNames)
    return (await websiteRepo.find(db, row.id, true))!
  },

  async update(db: Database, id: string, patch: Partial<typeof websites.$inferInsert>, tagNames?: string[]): Promise<WebsiteRecord | null> {
    const [row] = await db
      .update(websites)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(websites.id, id))
      .returning()
    if (!row) return null
    if (tagNames) await tagRepo.setForWebsite(db, id, tagNames)
    return websiteRepo.find(db, id, true)
  },

  async remove(db: Database, id: string): Promise<boolean> {
    const rows = await db.delete(websites).where(eq(websites.id, id)).returning()
    return rows.length > 0
  },

  async random(db: Database, excludeId?: string): Promise<WebsiteRecord | null> {
    const where = and(
      eq(websites.isActive, true),
      eq(universes.isActive, true),
      sql`${websites.url} is not null`,
      sql`length(${websites.description}) > 0`,
      excludeId ? sql`${websites.id} <> ${excludeId}` : undefined,
    )
    const rows = await baseSelect(db).where(where).orderBy(sql`random()`).limit(1)
    const [record] = await attachTags(db, rows)
    return record ?? null
  },

  async trending(db: Database, limit: number): Promise<WebsiteRecord[]> {
    const rows = await baseSelect(db)
      .where(and(eq(websites.isActive, true), eq(universes.isActive, true), eq(websites.isTrending, true)))
      .orderBy(desc(websites.trendingScore), asc(websites.name))
      .limit(limit)
    return attachTags(db, rows)
  },

  async emerging(db: Database, limit: number): Promise<WebsiteRecord[]> {
    const rows = await baseSelect(db)
      .where(and(eq(websites.isActive, true), eq(universes.isActive, true), eq(websites.isEmerging, true)))
      .orderBy(desc(websites.trendingScore), asc(websites.name))
      .limit(limit)
    return attachTags(db, rows)
  },

  async stats(db: Database) {
    const [row] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${websites.isActive})`,
        trending: sql<number>`count(*) filter (where ${websites.isTrending} and ${websites.isActive})`,
        emerging: sql<number>`count(*) filter (where ${websites.isEmerging} and ${websites.isActive})`,
      })
      .from(websites)
    return { total: Number(row.total), active: Number(row.active), trending: Number(row.trending), emerging: Number(row.emerging) }
  },
}
