import { z } from 'zod'
import { OBJECT_TYPES, RELATIONSHIP_TYPES, TREND_DIRECTIONS, UNIVERSE_VISUAL_TYPES } from '../db/schema.js'

export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lower-case slug')

export const uuidSchema = z.string().uuid()

/** Route params accept either a UUID or a slug. */
export const idOrSlugParam = z.object({ id: z.string().min(1).max(80) })

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const booleanQuery = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0'), z.boolean()])
  .transform((v) => v === true || v === 'true' || v === '1')

export const objectTypeSchema = z.enum(OBJECT_TYPES)
export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES)
export const visualTypeSchema = z.enum(UNIVERSE_VISUAL_TYPES)
export const trendDirectionSchema = z.enum(TREND_DIRECTIONS)

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'must be a #hex colour')

export const tagNameSchema = z.string().trim().min(1).max(32)

export const urlInputSchema = z.string().trim().min(4).max(2048)
