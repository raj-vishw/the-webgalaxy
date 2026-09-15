import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AppContext } from '../context.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { tagRepo } from '../repositories/tagRepo.js'
import { universeRepo } from '../repositories/universeRepo.js'
import { relationshipRepo } from '../repositories/relationshipRepo.js'
import { createTagSchema, loginSchema, updateTagSchema } from '../schemas/admin.js'
import { idOrSlugParam, uuidSchema } from '../schemas/common.js'
import { createRelationshipSchema, relationshipListQuery, updateRelationshipSchema } from '../schemas/relationships.js'
import { reviewSubmissionSchema, submissionListQuery } from '../schemas/submissions.js'
import { createUniverseSchema, updateUniverseSchema } from '../schemas/universes.js'
import { createWebsiteSchema, updateWebsiteSchema, websiteListQuery } from '../schemas/websites.js'
import { authService } from '../services/authService.js'
import { relationshipService } from '../services/relationshipService.js'
import { submissionService } from '../services/submissionService.js'
import { toPublicUniverse, universeService } from '../services/universeService.js'
import { websiteService } from '../services/websiteService.js'
import { notFound } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { validate } from '../utils/validate.js'

const uuidParam = z.object({ id: uuidSchema })

/** Protected handlers. Every route here sits behind `requireAuth` / `requireRole`. */
export const adminController = (ctx: AppContext) => ({
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = validate(loginSchema, request.body, 'credentials')
    const actor = await authService.authenticate(ctx, email, password)
    const token = await reply.jwtSign(actor, { expiresIn: ctx.env.JWT_EXPIRES_IN })
    return ok({ token, user: actor })
  },

  async me(request: FastifyRequest) {
    return ok(request.user)
  },

  async overview() {
    const [websites, universes, submissions, relationships] = await Promise.all([
      websiteService.stats(ctx),
      universeRepo.count(ctx.db),
      submissionService.counts(ctx),
      relationshipRepo.count(ctx.db),
    ])
    return ok({ websites, universes, submissions, relationships, database: ctx.db ? 'ok' : 'unknown' })
  },

  async audit() {
    return ok(await adminRepo.recentAudit(ctx.db, 50))
  },

  // ─── Submissions ──────────────────────────────────────────────────────────
  async listSubmissions(request: FastifyRequest) {
    const query = validate(submissionListQuery, request.query, 'query')
    const { data, pagination } = await submissionService.list(ctx, query.page, query.limit, query.status)
    return paginated(data, pagination)
  },

  async getSubmission(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    return ok(await submissionService.get(ctx, id))
  },

  async reviewSubmission(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    const input = validate(reviewSubmissionSchema, request.body, 'review')
    return ok(await submissionService.review(ctx, id, input, request.user))
  },

  // ─── Websites ─────────────────────────────────────────────────────────────
  async listWebsites(request: FastifyRequest) {
    const query = validate(websiteListQuery, request.query, 'query')
    const { data, pagination } = await websiteService.list(ctx, { ...query, includeInactive: query.includeInactive ?? true }, true)
    return paginated(data, pagination)
  },

  async getWebsite(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await websiteService.get(ctx, id, true))
  },

  async createWebsite(request: FastifyRequest, reply: FastifyReply) {
    const input = validate(createWebsiteSchema, request.body, 'website')
    reply.status(201)
    return ok(await websiteService.create(ctx, input, request.user))
  },

  async updateWebsite(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    const patch = validate(updateWebsiteSchema, request.body, 'website')
    return ok(await websiteService.update(ctx, id, patch, request.user))
  },

  async deleteWebsite(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    await websiteService.remove(ctx, id, request.user)
    return ok({ deleted: true })
  },

  // ─── Universes ────────────────────────────────────────────────────────────
  async listUniverses() {
    return ok((await universeRepo.list(ctx.db, true)).map(toPublicUniverse))
  },

  async createUniverse(request: FastifyRequest, reply: FastifyReply) {
    const input = validate(createUniverseSchema, request.body, 'universe')
    reply.status(201)
    return ok(await universeService.create(ctx, input, request.user))
  },

  async updateUniverse(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    const patch = validate(updateUniverseSchema, request.body, 'universe')
    return ok(await universeService.update(ctx, id, patch, request.user))
  },

  // ─── Relationships ────────────────────────────────────────────────────────
  async listRelationships(request: FastifyRequest) {
    const query = validate(relationshipListQuery, request.query, 'query')
    const { data, pagination } = await relationshipService.list(ctx, query.page, query.limit, query.type, true)
    return paginated(data, pagination)
  },

  async createRelationship(request: FastifyRequest, reply: FastifyReply) {
    const input = validate(createRelationshipSchema, request.body, 'relationship')
    reply.status(201)
    return ok(await relationshipService.create(ctx, input, request.user))
  },

  async updateRelationship(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    const patch = validate(updateRelationshipSchema, request.body, 'relationship')
    return ok(await relationshipService.update(ctx, id, patch, request.user))
  },

  async deleteRelationship(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    await relationshipService.remove(ctx, id, request.user)
    return ok({ deleted: true })
  },

  // ─── Tags ─────────────────────────────────────────────────────────────────
  async listTags() {
    return ok(await tagRepo.list(ctx.db))
  },

  async createTag(request: FastifyRequest, reply: FastifyReply) {
    const { name } = validate(createTagSchema, request.body, 'tag')
    const [tag] = await tagRepo.ensure(ctx.db, [name])
    reply.status(201)
    return ok(tag)
  },

  async updateTag(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    const { name } = validate(updateTagSchema, request.body, 'tag')
    const tag = await tagRepo.update(ctx.db, id, name)
    if (!tag) throw notFound('TAG_NOT_FOUND', 'The requested tag could not be found.')
    ctx.cache.clear()
    return ok(tag)
  },

  async deleteTag(request: FastifyRequest) {
    const { id } = validate(uuidParam, request.params, 'route')
    if (!(await tagRepo.remove(ctx.db, id))) throw notFound('TAG_NOT_FOUND', 'The requested tag could not be found.')
    ctx.cache.clear()
    return ok({ deleted: true })
  },
})
