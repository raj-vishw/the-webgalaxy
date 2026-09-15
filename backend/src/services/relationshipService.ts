import type { z } from 'zod'
import type { Actor, AppContext } from '../context.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { relationshipRepo } from '../repositories/relationshipRepo.js'
import type { createRelationshipSchema, updateRelationshipSchema } from '../schemas/relationships.js'
import { badRequest, conflict, notFound } from '../utils/errors.js'
import { paginationFor } from '../utils/response.js'
import { toPublicRelationship, type PublicRelationship, websiteService } from './websiteService.js'

const RELATIONSHIP_NOT_FOUND = () => notFound('RELATIONSHIP_NOT_FOUND', 'The requested relationship could not be found.')

/**
 * Relationships connect two websites as equals. The service enforces what
 * the database also enforces (no self links, no duplicates either way) so
 * callers get a readable 4xx instead of a constraint error.
 */
export const relationshipService = {
  async forWebsite(ctx: AppContext, idOrSlug: string, types?: string[]): Promise<PublicRelationship[]> {
    const website = await websiteService.resolve(ctx, idOrSlug)
    const rows = await relationshipRepo.forWebsite(ctx.db, website.id)
    return rows.filter((r) => !types || types.includes(r.type)).map(toPublicRelationship)
  },

  async list(ctx: AppContext, page: number, limit: number, type?: string, includeInactive = false) {
    const { rows, total } = await relationshipRepo.list(ctx.db, page, limit, type, includeInactive)
    return { data: rows.map(toPublicRelationship), pagination: paginationFor(page, limit, total) }
  },

  async create(ctx: AppContext, input: z.infer<typeof createRelationshipSchema>, actor: Actor | null): Promise<PublicRelationship> {
    const source = await websiteService.resolve(ctx, input.sourceId, true)
    const target = await websiteService.resolve(ctx, input.targetId, true)
    if (source.id === target.id) throw badRequest('SELF_RELATIONSHIP', 'A website cannot be related to itself.')
    if (await relationshipRepo.findBetween(ctx.db, source.id, target.id, input.type)) {
      throw conflict('DUPLICATE_RELATIONSHIP', `${source.name} and ${target.name} already have a "${input.type}" relationship.`)
    }
    const row = await relationshipRepo.create(ctx.db, {
      sourceWebsiteId: source.id,
      targetWebsiteId: target.id,
      type: input.type,
      directed: input.directed,
      strength: input.strength,
      note: input.note ?? null,
    })
    ctx.cache.clear()
    if (actor) {
      await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'relationship.create', entityType: 'relationship', entityId: row.id, details: { source: source.slug, target: target.slug, type: input.type } })
      ctx.log.info({ actor: actor.email, source: source.slug, target: target.slug, type: input.type }, 'relationship created')
    }
    return toPublicRelationship(row)
  },

  async update(ctx: AppContext, id: string, patch: z.infer<typeof updateRelationshipSchema>, actor: Actor): Promise<PublicRelationship> {
    const existing = await relationshipRepo.find(ctx.db, id)
    if (!existing) throw RELATIONSHIP_NOT_FOUND()
    if (patch.type && patch.type !== existing.type) {
      const dup = await relationshipRepo.findBetween(ctx.db, existing.sourceWebsiteId, existing.targetWebsiteId, patch.type)
      if (dup) throw conflict('DUPLICATE_RELATIONSHIP', 'That relationship already exists with this type.')
    }
    const row = await relationshipRepo.update(ctx.db, id, patch)
    if (!row) throw RELATIONSHIP_NOT_FOUND()
    ctx.cache.clear()
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'relationship.update', entityType: 'relationship', entityId: id, details: { fields: Object.keys(patch) } })
    return toPublicRelationship(row)
  },

  async remove(ctx: AppContext, id: string, actor: Actor): Promise<void> {
    const removed = await relationshipRepo.remove(ctx.db, id)
    if (!removed) throw RELATIONSHIP_NOT_FOUND()
    ctx.cache.clear()
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'relationship.delete', entityType: 'relationship', entityId: id })
    ctx.log.info({ actor: actor.email, relationship: id }, 'relationship deleted')
  },
}
