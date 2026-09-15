import { z } from 'zod'
import { objectTypeSchema, paginationQuery, slugSchema, tagNameSchema, urlInputSchema } from './common.js'
import { SUBMISSION_STATUSES } from '../db/schema.js'

export const createSubmissionSchema = z.object({
  websiteName: z.string().trim().min(2).max(80),
  url: urlInputSchema,
  description: z.string().trim().min(20).max(400),
  requestedUniverseId: z.string().min(1).max(80).optional(),
  tags: z.array(tagNameSchema).max(6).default([]),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional(),
})

export const submissionListQuery = paginationQuery.extend({
  status: z.enum(SUBMISSION_STATUSES).optional(),
})

export const reviewSubmissionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    /** Optional corrections applied to the website created from the submission. */
    overrides: z
      .object({
        name: z.string().trim().min(1).max(80).optional(),
        slug: slugSchema.optional(),
        description: z.string().trim().max(600).optional(),
        universeId: z.string().min(1).max(80).optional(),
        objectType: objectTypeSchema.optional(),
        importance: z.number().int().min(0).max(100).optional(),
        tags: z.array(tagNameSchema).max(8).optional(),
        logoUrl: z.string().trim().url().max(2048).nullable().optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal('reject'),
    rejectionReason: z.string().trim().min(3).max(300),
  }),
])
