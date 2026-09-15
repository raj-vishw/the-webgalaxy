import { and, asc, count, eq, or, sql } from 'drizzle-orm'
import type { Database } from '../db/client.js'
import { universes, type UniverseRow } from '../db/schema.js'

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** Matches a UUID or a slug — public routes accept both. */
export const byIdOrSlug = (idOrSlug: string) =>
  isUuid(idOrSlug) ? or(eq(universes.id, idOrSlug), eq(universes.slug, idOrSlug)) : eq(universes.slug, idOrSlug)

export const universeRepo = {
  async list(db: Database, includeInactive = false): Promise<(UniverseRow & { websiteCount: number })[]> {
    const rows = await db
      .select({
        universe: universes,
        // Drizzle drops table qualifiers in single-table selects, so the
        // correlated subquery is spelled out with explicit aliases.
        websiteCount: sql<number>`(select count(*) from websites w where w.universe_id = universes.id and w.is_active = true)`,
      })
      .from(universes)
      .where(includeInactive ? undefined : eq(universes.isActive, true))
      .orderBy(asc(universes.sortOrder), asc(universes.createdAt))
    return rows.map((r) => ({ ...r.universe, websiteCount: Number(r.websiteCount) }))
  },

  async find(db: Database, idOrSlug: string): Promise<UniverseRow | null> {
    const [row] = await db.select().from(universes).where(byIdOrSlug(idOrSlug)).limit(1)
    return row ?? null
  },

  async slugExists(db: Database, slug: string, exceptId?: string): Promise<boolean> {
    const [row] = await db
      .select({ n: count() })
      .from(universes)
      .where(exceptId ? and(eq(universes.slug, slug), sql`${universes.id} <> ${exceptId}`) : eq(universes.slug, slug))
    return Number(row?.n ?? 0) > 0
  },

  async create(db: Database, data: typeof universes.$inferInsert): Promise<UniverseRow> {
    const [row] = await db.insert(universes).values(data).returning()
    return row
  },

  async update(db: Database, id: string, patch: Partial<typeof universes.$inferInsert>): Promise<UniverseRow | null> {
    const [row] = await db
      .update(universes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(universes.id, id))
      .returning()
    return row ?? null
  },

  async count(db: Database): Promise<number> {
    const [row] = await db.select({ n: count() }).from(universes).where(eq(universes.isActive, true))
    return Number(row?.n ?? 0)
  },
}
