import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * The WebGalaxy schema.
 *
 * Conceptual rule, enforced by omission: universes are peers. There is no
 * parentUniverseId, no childUniverseId, no category tree. Websites belong to
 * exactly one universe; relationships connect two websites as equals and
 * never express ownership.
 */

export const UNIVERSE_VISUAL_TYPES = ['spiral', 'cluster', 'nebula', 'stream', 'planetary'] as const
export const OBJECT_TYPES = ['star', 'planet', 'moon', 'comet'] as const
export const RELATIONSHIP_TYPES = ['related', 'alternative', 'integration', 'ecosystem', 'complementary', 'competitor', 'same-company'] as const
export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected'] as const
export const ADMIN_ROLES = ['admin', 'editor'] as const
export const TREND_DIRECTIONS = ['up', 'steady', 'down'] as const

const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(', ')})`)

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/** Visual configuration of a universe: position, scale, palette, seed, interior layout. */
export interface UniverseVisualConfig {
  position: [number, number, number]
  scale: number
  palette: { core: string; primary: string; secondary: string }
  seed: number
  layout: { spread: [number, number, number]; coreBias: number; energy: number; dust: number }
}

export const universes = pgTable(
  'universes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    visualType: text('visual_type').notNull(),
    visualConfig: jsonb('visual_config').$type<UniverseVisualConfig>().notNull(),
    /** Only affects the intro's staggered reveal — never rank. */
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('universes_slug_idx').on(t.slug),
    check('universes_visual_type_check', inList('visual_type', UNIVERSE_VISUAL_TYPES)),
    check('universes_slug_format_check', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
)

export const websites = pgTable(
  'websites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    url: text('url'),
    /** Lower-cased, scheme/www/trailing-slash-normalised form used for duplicate detection. */
    urlNormalized: text('url_normalized'),
    description: text('description').notNull().default(''),
    logoUrl: text('logo_url'),
    universeId: uuid('universe_id')
      .notNull()
      .references(() => universes.id, { onDelete: 'restrict' }),
    objectType: text('object_type').notNull(),
    /** 0–100: visual prominence. */
    importance: integer('importance').notNull().default(50),
    /** 0–100: manually configured for now; future automated signals feed this. */
    popularityScore: integer('popularity_score').notNull().default(50),
    /** 0–1: static/admin-controlled trend strength. */
    trendingScore: real('trending_score').notNull().default(0),
    trendDirection: text('trend_direction').notNull().default('steady'),
    isTrending: boolean('is_trending').notNull().default(false),
    isEmerging: boolean('is_emerging').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    /** Brand accent (#hex) and 1–4 character monogram; both optional. */
    accent: text('accent'),
    glyph: text('glyph'),
    /** Moons only: the website whose position this moon circles. Visual only. */
    orbitAnchorId: uuid('orbit_anchor_id').references((): any => websites.id, { onDelete: 'set null' }),
    /** Deterministic seed for procedural placement; derived from the slug on insert. */
    positionSeed: integer('position_seed').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('websites_slug_idx').on(t.slug),
    uniqueIndex('websites_url_normalized_idx').on(t.urlNormalized),
    index('websites_universe_idx').on(t.universeId),
    index('websites_trending_idx').on(t.isTrending),
    index('websites_emerging_idx').on(t.isEmerging),
    check('websites_object_type_check', inList('object_type', OBJECT_TYPES)),
    check('websites_trend_direction_check', inList('trend_direction', TREND_DIRECTIONS)),
    check('websites_importance_check', sql`importance BETWEEN 0 AND 100`),
    check('websites_popularity_check', sql`popularity_score BETWEEN 0 AND 100`),
    check('websites_trending_score_check', sql`trending_score BETWEEN 0 AND 1`),
    check('websites_url_check', sql`url IS NULL OR url ~* '^https?://'`),
    check('websites_slug_format_check', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('websites_no_self_anchor_check', sql`orbit_anchor_id IS NULL OR orbit_anchor_id <> id`),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
  },
  (t) => [uniqueIndex('tags_slug_idx').on(t.slug)],
)

export const websiteTags = pgTable(
  'website_tags',
  {
    websiteId: uuid('website_id')
      .notNull()
      .references(() => websites.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.websiteId, t.tagId] }), index('website_tags_tag_idx').on(t.tagId)],
)

export const websiteRelationships = pgTable(
  'website_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceWebsiteId: uuid('source_website_id')
      .notNull()
      .references(() => websites.id, { onDelete: 'cascade' }),
    targetWebsiteId: uuid('target_website_id')
      .notNull()
      .references(() => websites.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    /** 0–1: how strong the connection is. */
    strength: real('strength').notNull().default(1),
    /** Symmetrical unless the connection genuinely flows one way. */
    directed: boolean('directed').notNull().default(false),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One connection per unordered pair and type, whichever way it was declared.
    uniqueIndex('website_relationships_pair_idx').on(
      sql`LEAST(${t.sourceWebsiteId}, ${t.targetWebsiteId})`,
      sql`GREATEST(${t.sourceWebsiteId}, ${t.targetWebsiteId})`,
      t.type,
    ),
    index('website_relationships_source_idx').on(t.sourceWebsiteId),
    index('website_relationships_target_idx').on(t.targetWebsiteId),
    check('website_relationships_type_check', inList('type', RELATIONSHIP_TYPES)),
    check('website_relationships_no_self_check', sql`source_website_id <> target_website_id`),
    check('website_relationships_strength_check', sql`strength BETWEEN 0 AND 1`),
  ],
)

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    websiteName: text('website_name').notNull(),
    url: text('url').notNull(),
    urlNormalized: text('url_normalized').notNull(),
    description: text('description').notNull(),
    requestedUniverseId: uuid('requested_universe_id').references(() => universes.id, { onDelete: 'set null' }),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    status: text('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by'),
    rejectionReason: text('rejection_reason'),
    /** The website created when the submission was approved. */
    websiteId: uuid('website_id').references(() => websites.id, { onDelete: 'set null' }),
    /** Hashed client address for rate limiting and abuse review; never the raw IP. */
    submitterHash: text('submitter_hash'),
  },
  (t) => [
    index('submissions_status_idx').on(t.status),
    index('submissions_url_idx').on(t.urlNormalized),
    check('submissions_status_check', inList('status', SUBMISSION_STATUSES)),
    check('submissions_url_check', sql`url ~* '^https?://'`),
  ],
)

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    /** scrypt hash, `scrypt$N$r$p$salt$hash` — never a plain password. */
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('editor'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('admin_users_email_idx').on(t.email), check('admin_users_role_check', inList('role', ADMIN_ROLES))],
)

/** Audit trail of administrative actions (who changed what, when). */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('admin_audit_log_at_idx').on(t.at)],
)

export type UniverseRow = typeof universes.$inferSelect
export type WebsiteRow = typeof websites.$inferSelect
export type TagRow = typeof tags.$inferSelect
export type RelationshipRow = typeof websiteRelationships.$inferSelect
export type SubmissionRow = typeof submissions.$inferSelect
export type AdminUserRow = typeof adminUsers.$inferSelect
