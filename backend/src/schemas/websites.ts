import { z } from 'zod'
import {
  booleanQuery,
  hexColorSchema,
  objectTypeSchema,
  paginationQuery,
  slugSchema,
  tagNameSchema,
  trendDirectionSchema,
  urlInputSchema,
} from './common.js'

export const websiteListQuery = paginationQuery.extend({
  universe: z.string().min(1).max(80).optional(),
  type: objectTypeSchema.optional(),
  trending: booleanQuery.optional(),
  emerging: booleanQuery.optional(),
  tag: z.string().min(1).max(64).optional(),
  q: z.string().trim().max(80).optional(),
  /** `light` = fields the galaxy needs to render; `full` adds description & timestamps. */
  fields: z.enum(['light', 'full']).default('light'),
  includeInactive: booleanQuery.optional(),
})

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  universe: z.string().min(1).max(80).optional(),
  type: objectTypeSchema.optional(),
})

export const createWebsiteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  url: urlInputSchema.nullable().optional(),
  description: z.string().trim().max(600).default(''),
  logoUrl: z.string().trim().url().max(2048).nullable().optional(),
  universeId: z.string().min(1).max(80),
  objectType: objectTypeSchema,
  importance: z.number().int().min(0).max(100).default(50),
  popularityScore: z.number().int().min(0).max(100).optional(),
  trendingScore: z.number().min(0).max(1).optional(),
  trendDirection: trendDirectionSchema.optional(),
  isTrending: z.boolean().optional(),
  isEmerging: z.boolean().optional(),
  isActive: z.boolean().optional(),
  accent: hexColorSchema.nullable().optional(),
  glyph: z.string().trim().min(1).max(4).nullable().optional(),
  orbitAnchorId: z.string().min(1).max(80).nullable().optional(),
  tags: z.array(tagNameSchema).max(8).default([]),
})

export const updateWebsiteSchema = createWebsiteSchema.partial()
