import { z } from 'zod'
import { hexColorSchema, slugSchema, visualTypeSchema } from './common.js'

const vec3 = z.tuple([z.number(), z.number(), z.number()])

export const visualConfigSchema = z.object({
  position: vec3,
  scale: z.number().min(1).max(60),
  palette: z.object({ core: hexColorSchema, primary: hexColorSchema, secondary: hexColorSchema }),
  seed: z.number().int().min(0),
  layout: z.object({
    spread: vec3,
    coreBias: z.number().min(0).max(1),
    energy: z.number().min(0).max(5),
    dust: z.number().min(0).max(5),
  }),
})

export const createUniverseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugSchema.optional(),
  description: z.string().trim().max(400).default(''),
  visualType: visualTypeSchema,
  visualConfig: visualConfigSchema,
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const updateUniverseSchema = createUniverseSchema.partial()

export const universeListQuery = z.object({
  includeInactive: z.coerce.boolean().optional(),
})
