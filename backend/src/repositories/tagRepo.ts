import { asc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../db/client.js'
import { tags, websiteTags, type TagRow } from '../db/schema.js'
import { slugify } from '../utils/slug.js'

export const tagRepo = {
  async list(db: Database): Promise<(TagRow & { websiteCount: number })[]> {
    const rows = await db.select().from(tags).orderBy(asc(tags.slug))
    const links = await db.select({ tagId: websiteTags.tagId }).from(websiteTags)
    const counts = new Map<string, number>()
    for (const l of links) counts.set(l.tagId, (counts.get(l.tagId) ?? 0) + 1)
    return rows.map((t) => ({ ...t, websiteCount: counts.get(t.id) ?? 0 }))
  },

  /** Finds or creates tags by name (matched on slug); returns them in input order. */
  async ensure(db: Database, names: string[]): Promise<TagRow[]> {
    const wanted = [...new Map(names.map((n) => [slugify(n), n.trim()])).entries()].filter(([slug]) => slug)
    if (!wanted.length) return []
    const slugs = wanted.map(([slug]) => slug)
    const existing = await db.select().from(tags).where(inArray(tags.slug, slugs))
    const have = new Map(existing.map((t) => [t.slug, t]))
    const missing = wanted.filter(([slug]) => !have.has(slug)).map(([slug, name]) => ({ slug, name: name.toLowerCase() }))
    if (missing.length) {
      const created = await db.insert(tags).values(missing).onConflictDoNothing().returning()
      for (const t of created) have.set(t.slug, t)
      // A concurrent insert may have won the conflict; re-read anything still missing.
      const still = missing.filter((m) => !have.has(m.slug)).map((m) => m.slug)
      if (still.length) for (const t of await db.select().from(tags).where(inArray(tags.slug, still))) have.set(t.slug, t)
    }
    return slugs.map((s) => have.get(s)).filter((t): t is TagRow => !!t)
  },

  async setForWebsite(db: Database, websiteId: string, names: string[]) {
    const rows = await tagRepo.ensure(db, names)
    await db.delete(websiteTags).where(eq(websiteTags.websiteId, websiteId))
    if (rows.length) await db.insert(websiteTags).values(rows.map((t) => ({ websiteId, tagId: t.id }))).onConflictDoNothing()
  },

  /** Tag slugs per website id, for a batch of websites. */
  async forWebsites(db: Database, websiteIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>()
    if (!websiteIds.length) return out
    const rows = await db
      .select({ websiteId: websiteTags.websiteId, slug: tags.slug })
      .from(websiteTags)
      .innerJoin(tags, eq(tags.id, websiteTags.tagId))
      .where(inArray(websiteTags.websiteId, websiteIds))
      .orderBy(asc(tags.slug))
    for (const r of rows) out.set(r.websiteId, [...(out.get(r.websiteId) ?? []), r.slug])
    return out
  },

  async update(db: Database, id: string, name: string): Promise<TagRow | null> {
    const [row] = await db.update(tags).set({ name: name.toLowerCase(), slug: slugify(name) }).where(eq(tags.id, id)).returning()
    return row ?? null
  },

  async remove(db: Database, id: string): Promise<boolean> {
    const rows = await db.delete(tags).where(eq(tags.id, id)).returning()
    return rows.length > 0
  },
}
