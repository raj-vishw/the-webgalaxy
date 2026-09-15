import type { z } from 'zod'
import type { Actor, AppContext } from '../context.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { submissionRepo, type SubmissionRecord } from '../repositories/submissionRepo.js'
import { universeRepo } from '../repositories/universeRepo.js'
import { websiteRepo } from '../repositories/websiteRepo.js'
import type { createSubmissionSchema, reviewSubmissionSchema } from '../schemas/submissions.js'
import { badRequest, conflict, notFound } from '../utils/errors.js'
import { paginationFor } from '../utils/response.js'
import { parseWebsiteUrl } from '../utils/url.js'
import { websiteService, type PublicWebsiteFull } from './websiteService.js'

export interface PublicSubmission {
  id: string
  websiteName: string
  url: string
  description: string
  requestedUniverseId: string | null
  requestedUniverseSlug: string | null
  requestedUniverseName: string | null
  tags: string[]
  status: string
  submittedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  websiteId: string | null
}

export function toPublicSubmission(r: SubmissionRecord): PublicSubmission {
  return {
    id: r.id,
    websiteName: r.websiteName,
    url: r.url,
    description: r.description,
    requestedUniverseId: r.requestedUniverseId,
    requestedUniverseSlug: r.requestedUniverseSlug,
    requestedUniverseName: r.requestedUniverseName,
    tags: r.tags,
    status: r.status,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    rejectionReason: r.rejectionReason,
    websiteId: r.websiteId,
  }
}

const SUBMISSION_NOT_FOUND = () => notFound('SUBMISSION_NOT_FOUND', 'The requested submission could not be found.')

/**
 * Public submissions never become visible on their own: they wait as
 * `pending` until an administrator approves them, at which point a website
 * is created (inactive websites are never served to the galaxy).
 */
export const submissionService = {
  /** Non-destructive check used by the form before submitting. */
  async checkUrl(ctx: AppContext, url: string): Promise<{ valid: boolean; exists: boolean; pending: boolean; website: { slug: string; name: string } | null }> {
    const parsed = parseWebsiteUrl(url)
    if (!parsed) return { valid: false, exists: false, pending: false, website: null }
    const existing = await websiteRepo.findByNormalizedUrl(ctx.db, parsed.normalized)
    const pending = existing ? null : await submissionRepo.findPendingByUrl(ctx.db, parsed.normalized)
    return {
      valid: true,
      exists: !!existing,
      pending: !!pending,
      website: existing ? { slug: existing.slug, name: existing.name } : null,
    }
  },

  async create(ctx: AppContext, input: z.infer<typeof createSubmissionSchema>, submitterHash: string | null): Promise<PublicSubmission> {
    if (input.website) throw badRequest('VALIDATION_ERROR', 'Invalid submission.')
    const parsed = parseWebsiteUrl(input.url)
    if (!parsed) throw badRequest('INVALID_URL', 'Please enter a public http(s) website address.')
    if (await websiteRepo.findByNormalizedUrl(ctx.db, parsed.normalized)) {
      throw conflict('WEBSITE_EXISTS', 'This website is already in the WebGalaxy.')
    }
    if (await submissionRepo.findPendingByUrl(ctx.db, parsed.normalized)) {
      throw conflict('SUBMISSION_PENDING', 'This website has already been submitted and is awaiting review.')
    }
    let requestedUniverseId: string | null = null
    if (input.requestedUniverseId) {
      const universe = await universeRepo.find(ctx.db, input.requestedUniverseId)
      if (!universe || !universe.isActive) throw badRequest('INVALID_UNIVERSE', 'Please choose one of the existing universes.')
      requestedUniverseId = universe.id
    }
    const record = await submissionRepo.create(ctx.db, {
      websiteName: input.websiteName,
      url: parsed.href,
      urlNormalized: parsed.normalized,
      description: input.description,
      requestedUniverseId,
      tags: input.tags.map((t) => t.toLowerCase()),
      submitterHash,
    })
    ctx.log.info({ submission: record.id, url: parsed.normalized }, 'submission received')
    return toPublicSubmission(record)
  },

  async list(ctx: AppContext, page: number, limit: number, status?: string) {
    const { rows, total } = await submissionRepo.list(ctx.db, page, limit, status)
    return { data: rows.map(toPublicSubmission), pagination: paginationFor(page, limit, total) }
  },

  async get(ctx: AppContext, id: string): Promise<PublicSubmission> {
    const record = await submissionRepo.find(ctx.db, id)
    if (!record) throw SUBMISSION_NOT_FOUND()
    return toPublicSubmission(record)
  },

  async review(ctx: AppContext, id: string, input: z.infer<typeof reviewSubmissionSchema>, actor: Actor): Promise<{ submission: PublicSubmission; website: PublicWebsiteFull | null }> {
    const record = await submissionRepo.find(ctx.db, id)
    if (!record) throw SUBMISSION_NOT_FOUND()
    if (record.status !== 'pending') throw conflict('SUBMISSION_ALREADY_REVIEWED', 'This submission has already been reviewed.')

    if (input.action === 'reject') {
      const updated = await submissionRepo.update(ctx.db, id, { status: 'rejected', reviewedAt: new Date(), reviewedBy: actor.id, rejectionReason: input.rejectionReason })
      await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'submission.reject', entityType: 'submission', entityId: id, details: { reason: input.rejectionReason } })
      ctx.log.info({ actor: actor.email, submission: id }, 'submission rejected')
      return { submission: toPublicSubmission(updated!), website: null }
    }

    const o = input.overrides ?? {}
    const universeId = o.universeId ?? record.requestedUniverseId
    if (!universeId) throw badRequest('UNIVERSE_REQUIRED', 'Choose a universe for this website before approving.')
    const website = await websiteService.create(
      ctx,
      {
        name: o.name ?? record.websiteName,
        slug: o.slug,
        url: record.url,
        description: o.description ?? record.description,
        logoUrl: o.logoUrl ?? null,
        universeId,
        objectType: o.objectType ?? 'planet',
        importance: o.importance ?? 40,
        tags: o.tags ?? record.tags,
        isActive: true,
      },
      actor,
    )
    const updated = await submissionRepo.update(ctx.db, id, { status: 'approved', reviewedAt: new Date(), reviewedBy: actor.id, websiteId: website.id })
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'submission.approve', entityType: 'submission', entityId: id, details: { website: website.slug } })
    ctx.log.info({ actor: actor.email, submission: id, website: website.slug }, 'submission approved')
    return { submission: toPublicSubmission(updated!), website }
  },

  counts(ctx: AppContext) {
    return submissionRepo.counts(ctx.db)
  },
}
