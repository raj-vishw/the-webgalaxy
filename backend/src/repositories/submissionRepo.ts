import { and, count, desc, eq } from 'drizzle-orm'
import type { Database } from '../db/client.js'
import { submissions, universes, type SubmissionRow } from '../db/schema.js'

export interface SubmissionRecord extends SubmissionRow {
  requestedUniverseSlug: string | null
  requestedUniverseName: string | null
}

const baseSelect = (db: Database) =>
  db
    .select({ submission: submissions, universeSlug: universes.slug, universeName: universes.name })
    .from(submissions)
    .leftJoin(universes, eq(universes.id, submissions.requestedUniverseId))

const flatten = (rows: { submission: SubmissionRow; universeSlug: string | null; universeName: string | null }[]): SubmissionRecord[] =>
  rows.map((r) => ({ ...r.submission, requestedUniverseSlug: r.universeSlug, requestedUniverseName: r.universeName }))

export const submissionRepo = {
  async create(db: Database, data: typeof submissions.$inferInsert): Promise<SubmissionRecord> {
    const [row] = await db.insert(submissions).values(data).returning()
    return (await submissionRepo.find(db, row.id))!
  },

  async find(db: Database, id: string): Promise<SubmissionRecord | null> {
    const rows = await baseSelect(db).where(eq(submissions.id, id)).limit(1)
    return flatten(rows)[0] ?? null
  },

  async findPendingByUrl(db: Database, normalized: string): Promise<SubmissionRecord | null> {
    const rows = await baseSelect(db)
      .where(and(eq(submissions.urlNormalized, normalized), eq(submissions.status, 'pending')))
      .limit(1)
    return flatten(rows)[0] ?? null
  },

  async list(db: Database, page: number, limit: number, status?: string): Promise<{ rows: SubmissionRecord[]; total: number }> {
    const where = status ? eq(submissions.status, status) : undefined
    const [{ n }] = await db.select({ n: count() }).from(submissions).where(where)
    const rows = await baseSelect(db)
      .where(where)
      .orderBy(desc(submissions.submittedAt))
      .limit(limit)
      .offset((page - 1) * limit)
    return { rows: flatten(rows), total: Number(n) }
  },

  async update(db: Database, id: string, patch: Partial<typeof submissions.$inferInsert>): Promise<SubmissionRecord | null> {
    const [row] = await db.update(submissions).set(patch).where(eq(submissions.id, id)).returning()
    return row ? submissionRepo.find(db, row.id) : null
  },

  async counts(db: Database): Promise<Record<'pending' | 'approved' | 'rejected', number>> {
    const rows = await db.select({ status: submissions.status, n: count() }).from(submissions).groupBy(submissions.status)
    const out = { pending: 0, approved: 0, rejected: 0 }
    for (const r of rows) if (r.status in out) out[r.status as keyof typeof out] = Number(r.n)
    return out
  },
}
