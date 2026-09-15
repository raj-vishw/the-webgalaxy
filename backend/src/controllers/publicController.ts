import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppContext } from '../context.js'
import { idOrSlugParam, paginationQuery } from '../schemas/common.js'
import { relationshipListQuery } from '../schemas/relationships.js'
import { createSubmissionSchema } from '../schemas/submissions.js'
import { universeListQuery } from '../schemas/universes.js'
import { searchQuery, websiteListQuery } from '../schemas/websites.js'
import { discoveryService } from '../services/discoveryService.js'
import { relationshipService } from '../services/relationshipService.js'
import { searchService } from '../services/searchService.js'
import { submissionService } from '../services/submissionService.js'
import { universeService } from '../services/universeService.js'
import { websiteService } from '../services/websiteService.js'
import { clientHash } from '../middleware/requestId.js'
import { ok, paginated } from '../utils/response.js'
import { validate } from '../utils/validate.js'
import { z } from 'zod'

/** Public, read-only handlers (plus the one public write: submissions). */
export const publicController = (ctx: AppContext) => ({
  async listUniverses(request: FastifyRequest, reply: FastifyReply) {
    validate(universeListQuery, request.query, 'query')
    reply.header('cache-control', 'public, max-age=60')
    return ok(await universeService.list(ctx))
  },

  async getUniverse(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await universeService.get(ctx, id))
  },

  async listWebsites(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(websiteListQuery, request.query, 'query')
    reply.header('cache-control', 'public, max-age=30')
    const { data, pagination } = await websiteService.list(ctx, query)
    return paginated(data, pagination)
  },

  async getWebsite(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await websiteService.get(ctx, id))
  },

  async websiteRelationships(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await relationshipService.forWebsite(ctx, id))
  },

  async websiteRelated(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await discoveryService.related(ctx, id))
  },

  async websiteAlternatives(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await discoveryService.alternatives(ctx, id))
  },

  async websiteIntegrations(request: FastifyRequest) {
    const { id } = validate(idOrSlugParam, request.params, 'route')
    return ok(await discoveryService.integrations(ctx, id))
  },

  async listRelationships(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(relationshipListQuery, request.query, 'query')
    reply.header('cache-control', 'public, max-age=30')
    const { data, pagination } = await relationshipService.list(ctx, query.page, query.limit, query.type)
    return paginated(data, pagination)
  },

  async search(request: FastifyRequest) {
    const query = validate(searchQuery, request.query, 'query')
    return ok(await searchService.search(ctx, query.q, query.limit, { universe: query.universe, type: query.type }))
  },

  async discoverRandom(request: FastifyRequest) {
    const { exclude } = validate(z.object({ exclude: z.string().max(80).optional() }), request.query, 'query')
    return ok(await discoveryService.random(ctx, exclude ? (await websiteService.resolve(ctx, exclude).catch(() => null))?.id : undefined))
  },

  async discoverTrending(request: FastifyRequest, reply: FastifyReply) {
    const { limit } = validate(paginationQuery.pick({ limit: true }), { limit: (request.query as { limit?: string }).limit ?? 6 }, 'query')
    reply.header('cache-control', 'public, max-age=60')
    return ok(await discoveryService.trending(ctx, Math.min(limit, 24)))
  },

  async discoverEmerging(request: FastifyRequest, reply: FastifyReply) {
    const { limit } = validate(paginationQuery.pick({ limit: true }), { limit: (request.query as { limit?: string }).limit ?? 6 }, 'query')
    reply.header('cache-control', 'public, max-age=60')
    return ok(await discoveryService.emerging(ctx, Math.min(limit, 24)))
  },

  async checkSubmissionUrl(request: FastifyRequest) {
    const { url } = validate(z.object({ url: z.string().trim().min(4).max(2048) }), request.query, 'query')
    return ok(await submissionService.checkUrl(ctx, url))
  },

  async createSubmission(request: FastifyRequest, reply: FastifyReply) {
    const input = validate(createSubmissionSchema, request.body, 'submission')
    const submission = await submissionService.create(ctx, input, clientHash(request, ctx.env.JWT_SECRET))
    reply.status(201)
    return ok(submission)
  },
})
