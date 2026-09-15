import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
})

export const createTagSchema = z.object({ name: z.string().trim().min(1).max(32) })
export const updateTagSchema = createTagSchema
