import { count, desc, eq, ne } from 'drizzle-orm'
import type { Database } from '../db/client.js'
import { adminAuditLog, adminUsers, type AdminUserRow } from '../db/schema.js'

export const adminRepo = {
  async findByEmail(db: Database, email: string): Promise<AdminUserRow | null> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase())).limit(1)
    return row ?? null
  },

  async findById(db: Database, id: string): Promise<AdminUserRow | null> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
    return row ?? null
  },

  async count(db: Database): Promise<number> {
    const [row] = await db.select({ n: count() }).from(adminUsers)
    return Number(row?.n ?? 0)
  },

  async create(db: Database, data: typeof adminUsers.$inferInsert): Promise<AdminUserRow> {
    const [row] = await db.insert(adminUsers).values({ ...data, email: data.email.toLowerCase() }).returning()
    return row
  },

  async update(db: Database, id: string, patch: Partial<typeof adminUsers.$inferInsert>) {
    await db.update(adminUsers).set({ ...patch, updatedAt: new Date() }).where(eq(adminUsers.id, id))
  },

  /** Deletes every administrator except `keepId`; returns how many were removed. */
  async removeOthers(db: Database, keepId: string): Promise<number> {
    const rows = await db.delete(adminUsers).where(ne(adminUsers.id, keepId)).returning()
    return rows.length
  },

  async touchLogin(db: Database, id: string) {
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id))
  },

  async audit(db: Database, entry: typeof adminAuditLog.$inferInsert) {
    await db.insert(adminAuditLog).values(entry)
  },

  async recentAudit(db: Database, limit = 50) {
    return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.at)).limit(limit)
  },
}
