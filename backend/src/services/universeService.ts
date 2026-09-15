import type { z } from 'zod'
import type { Actor, AppContext } from '../context.js'
import type { UniverseRow } from '../db/schema.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { universeRepo } from '../repositories/universeRepo.js'
import type { createUniverseSchema, updateUniverseSchema } from '../schemas/universes.js'
import { conflict, notFound } from '../utils/errors.js'
import { slugify } from '../utils/slug.js'

export interface PublicUniverse {
  id: string
  slug: string
  name: string
  description: string
  visualType: string
  visualConfig: UniverseRow['visualConfig']
  sortOrder: number
  isActive: boolean
  websiteCount?: number
  createdAt: string
  updatedAt: string
}

export function toPublicUniverse(row: UniverseRow & { websiteCount?: number }): PublicUniverse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    visualType: row.visualType,
    visualConfig: row.visualConfig,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    websiteCount: row.websiteCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const UNIVERSE_NOT_FOUND = () => notFound('UNIVERSE_NOT_FOUND', 'The requested universe could not be found.')

/**
 * Universes are peers: this service exposes a flat list and never a tree.
 * There is deliberately no "parent" or "children" anywhere in it.
 */
export const universeService = {
  async list(ctx: AppContext, includeInactive = false): Promise<PublicUniverse[]> {
    const key = `universes:${includeInactive ? 'all' : 'active'}`
    return ctx.cache.remember(key, async () => (await universeRepo.list(ctx.db, includeInactive)).map(toPublicUniverse), 60_000)
  },

  async get(ctx: AppContext, idOrSlug: string, includeInactive = false): Promise<PublicUniverse> {
    const row = await universeRepo.find(ctx.db, idOrSlug)
    if (!row || (!includeInactive && !row.isActive)) throw UNIVERSE_NOT_FOUND()
    return toPublicUniverse(row)
  },

  /** Resolves an id or slug to the internal id, or throws. */
  async resolveId(ctx: AppContext, idOrSlug: string): Promise<string> {
    const row = await universeRepo.find(ctx.db, idOrSlug)
    if (!row) throw UNIVERSE_NOT_FOUND()
    return row.id
  },

  async create(ctx: AppContext, input: z.infer<typeof createUniverseSchema>, actor: Actor): Promise<PublicUniverse> {
    const slug = input.slug ?? slugify(input.name)
    if (await universeRepo.slugExists(ctx.db, slug)) throw conflict('UNIVERSE_SLUG_TAKEN', `A universe with the slug "${slug}" already exists.`)
    const row = await universeRepo.create(ctx.db, { ...input, slug })
    ctx.cache.clear('universes')
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'universe.create', entityType: 'universe', entityId: row.id, details: { slug } })
    ctx.log.info({ actor: actor.email, universe: slug }, 'universe created')
    return toPublicUniverse(row)
  },

  async update(ctx: AppContext, idOrSlug: string, patch: z.infer<typeof updateUniverseSchema>, actor: Actor): Promise<PublicUniverse> {
    const existing = await universeRepo.find(ctx.db, idOrSlug)
    if (!existing) throw UNIVERSE_NOT_FOUND()
    if (patch.slug && patch.slug !== existing.slug && (await universeRepo.slugExists(ctx.db, patch.slug, existing.id))) {
      throw conflict('UNIVERSE_SLUG_TAKEN', `A universe with the slug "${patch.slug}" already exists.`)
    }
    const row = await universeRepo.update(ctx.db, existing.id, patch)
    if (!row) throw UNIVERSE_NOT_FOUND()
    ctx.cache.clear()
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'universe.update', entityType: 'universe', entityId: row.id, details: { fields: Object.keys(patch) } })
    ctx.log.info({ actor: actor.email, universe: row.slug, fields: Object.keys(patch) }, 'universe updated')
    return toPublicUniverse(row)
  },
}
