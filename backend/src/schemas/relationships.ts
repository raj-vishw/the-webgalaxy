import { z } from 'zod'
import { relationshipTypeSchema } from './common.js'

export const createRelationshipSchema = z.object({
  sourceId: z.string().min(1).max(80),
  targetId: z.string().min(1).max(80),
  type: relationshipTypeSchema,
  directed: z.boolean().default(false),
  strength: z.number().min(0).max(1).default(1),
  note: z.string().trim().max(160).nullable().optional(),
})

export const updateRelationshipSchema = createRelationshipSchema.partial().omit({ sourceId: true, targetId: true })

export const relationshipListQuery = z.object({
  type: relationshipTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})
