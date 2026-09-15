import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '../db/client.js'
import { websiteRelationships, websites, type RelationshipRow } from '../db/schema.js'

/** A relationship with both endpoints' public identifiers. */
export interface RelationshipRecord extends RelationshipRow {
  sourceSlug: string
  sourceName: string
  targetSlug: string
  targetName: string
}

const source = alias(websites, 'source')
const target = alias(websites, 'target')

const baseSelect = (db: Database) =>
  db
    .select({
      relationship: websiteRelationships,
      sourceSlug: source.slug,
      sourceName: source.name,
      targetSlug: target.slug,
      targetName: target.name,
      sourceActive: source.isActive,
      targetActive: target.isActive,
    })
    .from(websiteRelationships)
    .innerJoin(source, eq(source.id, websiteRelationships.sourceWebsiteId))
    .innerJoin(target, eq(target.id, websiteRelationships.targetWebsiteId))

interface Joined {
  relationship: RelationshipRow
  sourceSlug: string
  sourceName: string
  targetSlug: string
  targetName: string
}

const flatten = (rows: Joined[]): RelationshipRecord[] =>
  rows.map((r) => ({ ...r.relationship, sourceSlug: r.sourceSlug, sourceName: r.sourceName, targetSlug: r.targetSlug, targetName: r.targetName }))

export const relationshipRepo = {
  /** Relationships touching a website (either end), active endpoints only. */
  async forWebsite(db: Database, websiteId: string, type?: string): Promise<RelationshipRecord[]> {
    const rows = await baseSelect(db)
      .where(
        and(
          or(eq(websiteRelationships.sourceWebsiteId, websiteId), eq(websiteRelationships.targetWebsiteId, websiteId)),
          eq(source.isActive, true),
          eq(target.isActive, true),
          type ? eq(websiteRelationships.type, type) : undefined,
        ),
      )
      .orderBy(desc(websiteRelationships.strength), asc(websiteRelationships.createdAt))
    return flatten(rows)
  },

  async list(db: Database, page: number, limit: number, type?: string, includeInactive = false): Promise<{ rows: RelationshipRecord[]; total: number }> {
    const where = and(
      type ? eq(websiteRelationships.type, type) : undefined,
      includeInactive ? undefined : and(eq(source.isActive, true), eq(target.isActive, true)),
    )
    const [{ n }] = await db
      .select({ n: count() })
      .from(websiteRelationships)
      .innerJoin(source, eq(source.id, websiteRelationships.sourceWebsiteId))
      .innerJoin(target, eq(target.id, websiteRelationships.targetWebsiteId))
      .where(where)
    const rows = await baseSelect(db)
      .where(where)
      .orderBy(asc(source.slug), asc(target.slug))
      .limit(limit)
      .offset((page - 1) * limit)
    return { rows: flatten(rows), total: Number(n) }
  },

  async find(db: Database, id: string): Promise<RelationshipRecord | null> {
    const rows = await baseSelect(db).where(eq(websiteRelationships.id, id)).limit(1)
    return flatten(rows)[0] ?? null
  },

  /** The relationship of a type between two websites, whichever way it was declared. */
  async findBetween(db: Database, a: string, b: string, type: string): Promise<RelationshipRecord | null> {
    const rows = await baseSelect(db)
      .where(
        and(
          eq(websiteRelationships.type, type),
          sql`LEAST(${websiteRelationships.sourceWebsiteId}, ${websiteRelationships.targetWebsiteId}) = LEAST(${a}::uuid, ${b}::uuid)`,
          sql`GREATEST(${websiteRelationships.sourceWebsiteId}, ${websiteRelationships.targetWebsiteId}) = GREATEST(${a}::uuid, ${b}::uuid)`,
        ),
      )
      .limit(1)
    return flatten(rows)[0] ?? null
  },

  async create(db: Database, data: typeof websiteRelationships.$inferInsert): Promise<RelationshipRecord> {
    const [row] = await db.insert(websiteRelationships).values(data).returning()
    return (await relationshipRepo.find(db, row.id))!
  },

  async update(db: Database, id: string, patch: Partial<typeof websiteRelationships.$inferInsert>): Promise<RelationshipRecord | null> {
    const [row] = await db.update(websiteRelationships).set(patch).where(eq(websiteRelationships.id, id)).returning()
    return row ? relationshipRepo.find(db, row.id) : null
  },

  async remove(db: Database, id: string): Promise<boolean> {
    const rows = await db.delete(websiteRelationships).where(eq(websiteRelationships.id, id)).returning()
    return rows.length > 0
  },

  async count(db: Database): Promise<number> {
    const [row] = await db.select({ n: count() }).from(websiteRelationships)
    return Number(row?.n ?? 0)
  },
}
