import type { AppContext } from '../context.js'
import { websiteRepo } from '../repositories/websiteRepo.js'
import { notFound } from '../utils/errors.js'
import { relationshipService } from './relationshipService.js'
import { toLight, type PublicRelationship, type PublicWebsiteLight } from './websiteService.js'

/**
 * Discovery answers "where next?" from the database. Trending and emerging
 * are static/admin-controlled flags for now — never presented as live
 * measurements. Related / alternatives / integrations come straight from the
 * relationship graph; nothing is inferred.
 */
export const discoveryService = {
  async random(ctx: AppContext, excludeId?: string): Promise<PublicWebsiteLight> {
    const record = await websiteRepo.random(ctx.db, excludeId)
    if (!record) throw notFound('NOTHING_TO_DISCOVER', 'There is nothing to discover yet.')
    return toLight(record)
  },

  trending(ctx: AppContext, limit = 6): Promise<PublicWebsiteLight[]> {
    return ctx.cache.remember(`discovery:trending:${limit}`, async () => (await websiteRepo.trending(ctx.db, limit)).map(toLight), 60_000)
  },

  emerging(ctx: AppContext, limit = 6): Promise<PublicWebsiteLight[]> {
    return ctx.cache.remember(`discovery:emerging:${limit}`, async () => (await websiteRepo.emerging(ctx.db, limit)).map(toLight), 60_000)
  },

  related(ctx: AppContext, idOrSlug: string): Promise<PublicRelationship[]> {
    return relationshipService.forWebsite(ctx, idOrSlug)
  },

  alternatives(ctx: AppContext, idOrSlug: string): Promise<PublicRelationship[]> {
    return relationshipService.forWebsite(ctx, idOrSlug, ['alternative'])
  },

  integrations(ctx: AppContext, idOrSlug: string): Promise<PublicRelationship[]> {
    return relationshipService.forWebsite(ctx, idOrSlug, ['integration', 'complementary'])
  },
}
