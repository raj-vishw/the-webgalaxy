import type { z } from 'zod'
import type { Actor, AppContext } from '../context.js'
import { adminRepo } from '../repositories/adminRepo.js'
import { relationshipRepo, type RelationshipRecord } from '../repositories/relationshipRepo.js'
import { websiteRepo, type WebsiteFilters, type WebsiteRecord } from '../repositories/websiteRepo.js'
import type { createWebsiteSchema, updateWebsiteSchema, websiteListQuery } from '../schemas/websites.js'
import { badRequest, conflict, notFound } from '../utils/errors.js'
import { paginationFor, type Pagination } from '../utils/response.js'
import { hashString, slugify } from '../utils/slug.js'
import { parseWebsiteUrl } from '../utils/url.js'
import { universeService } from './universeService.js'

/** Fields the galaxy needs to place and draw a website. */
export interface PublicWebsiteLight {
  id: string
  slug: string
  name: string
  url: string | null
  universeId: string
  universeSlug: string
  objectType: string
  importance: number
  popularityScore: number
  trendingScore: number
  trendDirection: string
  isTrending: boolean
  isEmerging: boolean
  accent: string | null
  glyph: string | null
  logoUrl: string | null
  /** Slug of the website this moon circles (visual arrangement only). */
  orbitAnchorId: string | null
  tags: string[]
  positionSeed: number
}

export interface PublicRelationship {
  id: string
  type: string
  directed: boolean
  strength: number
  note: string | null
  source: { id: string; slug: string; name: string }
  target: { id: string; slug: string; name: string }
}

/** Everything about one website, fetched when it is selected. */
export interface PublicWebsiteFull extends PublicWebsiteLight {
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  relationships: PublicRelationship[]
}

export function toLight(r: WebsiteRecord): PublicWebsiteLight {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    url: r.url,
    universeId: r.universeId,
    universeSlug: r.universeSlug,
    objectType: r.objectType,
    importance: r.importance,
    popularityScore: r.popularityScore,
    trendingScore: r.trendingScore,
    trendDirection: r.trendDirection,
    isTrending: r.isTrending,
    isEmerging: r.isEmerging,
    accent: r.accent,
    glyph: r.glyph,
    logoUrl: r.logoUrl,
    orbitAnchorId: r.anchorSlug,
    tags: r.tags,
    positionSeed: r.positionSeed,
  }
}

export function toPublicRelationship(r: RelationshipRecord): PublicRelationship {
  return {
    id: r.id,
    type: r.type,
    directed: r.directed,
    strength: r.strength,
    note: r.note,
    source: { id: r.sourceWebsiteId, slug: r.sourceSlug, name: r.sourceName },
    target: { id: r.targetWebsiteId, slug: r.targetSlug, name: r.targetName },
  }
}

export function toFull(r: WebsiteRecord, relationships: RelationshipRecord[]): PublicWebsiteFull {
  return {
    ...toLight(r),
    description: r.description,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    relationships: relationships.map(toPublicRelationship),
  }
}

const WEBSITE_NOT_FOUND = () => notFound('WEBSITE_NOT_FOUND', 'The requested website could not be found.')

type CreateInput = z.infer<typeof createWebsiteSchema>
type UpdateInput = z.infer<typeof updateWebsiteSchema>

/** Validates and normalises a URL for storage; `null` clears it. */
function urlColumns(url: string | null | undefined): { url: string | null; urlNormalized: string | null } | undefined {
  if (url === undefined) return undefined
  if (url === null) return { url: null, urlNormalized: null }
  const parsed = parseWebsiteUrl(url)
  if (!parsed) throw badRequest('INVALID_URL', 'The URL must be a public http(s) address.')
  return { url: parsed.href, urlNormalized: parsed.normalized }
}

export const websiteService = {
  async list(ctx: AppContext, query: z.infer<typeof websiteListQuery>, includeInactive = false) {
    const filters: WebsiteFilters = {
      universe: query.universe,
      type: query.type,
      trending: query.trending,
      emerging: query.emerging,
      tag: query.tag,
      q: query.q,
      includeInactive: includeInactive && query.includeInactive,
    }
    const { rows, total } = await websiteRepo.list(ctx.db, filters, query.page, query.limit)
    const pagination: Pagination = paginationFor(query.page, query.limit, total)
    if (query.fields === 'full') {
      const data = await Promise.all(rows.map(async (r) => toFull(r, await relationshipRepo.forWebsite(ctx.db, r.id))))
      return { data, pagination }
    }
    return { data: rows.map(toLight), pagination }
  },

  async get(ctx: AppContext, idOrSlug: string, includeInactive = false): Promise<PublicWebsiteFull> {
    const record = await websiteRepo.find(ctx.db, idOrSlug, includeInactive)
    if (!record) throw WEBSITE_NOT_FOUND()
    return toFull(record, await relationshipRepo.forWebsite(ctx.db, record.id))
  },

  async resolve(ctx: AppContext, idOrSlug: string, includeInactive = false): Promise<WebsiteRecord> {
    const record = await websiteRepo.find(ctx.db, idOrSlug, includeInactive)
    if (!record) throw WEBSITE_NOT_FOUND()
    return record
  },

  /** A unique slug derived from the name (suffixed if taken). */
  async uniqueSlug(ctx: AppContext, base: string): Promise<string> {
    const root = slugify(base) || 'website'
    let slug = root
    for (let i = 2; await websiteRepo.slugExists(ctx.db, slug); i++) slug = `${root}-${i}`
    return slug
  },

  async create(ctx: AppContext, input: CreateInput, actor: Actor | null): Promise<PublicWebsiteFull> {
    const universeId = await universeService.resolveId(ctx, input.universeId)
    const slug = input.slug ?? (await websiteService.uniqueSlug(ctx, input.name))
    if (await websiteRepo.slugExists(ctx.db, slug)) throw conflict('WEBSITE_SLUG_TAKEN', `A website with the slug "${slug}" already exists.`)
    const urls = urlColumns(input.url) ?? { url: null, urlNormalized: null }
    if (urls.urlNormalized && (await websiteRepo.findByNormalizedUrl(ctx.db, urls.urlNormalized))) {
      throw conflict('WEBSITE_URL_EXISTS', 'This website is already in the WebGalaxy.')
    }
    const anchorId = input.orbitAnchorId ? (await websiteService.resolve(ctx, input.orbitAnchorId, true)).id : null
    const { tags, orbitAnchorId: _anchor, url: _url, universeId: _u, slug: _s, ...rest } = input
    const record = await websiteRepo.create(
      ctx.db,
      { ...rest, ...urls, slug, universeId, orbitAnchorId: anchorId, positionSeed: hashString(slug) },
      tags,
    )
    ctx.cache.clear()
    if (actor) {
      await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'website.create', entityType: 'website', entityId: record.id, details: { slug } })
      ctx.log.info({ actor: actor.email, website: slug }, 'website created')
    }
    return toFull(record, [])
  },

  async update(ctx: AppContext, idOrSlug: string, patch: UpdateInput, actor: Actor): Promise<PublicWebsiteFull> {
    const existing = await websiteService.resolve(ctx, idOrSlug, true)
    if (patch.slug && patch.slug !== existing.slug && (await websiteRepo.slugExists(ctx.db, patch.slug))) {
      throw conflict('WEBSITE_SLUG_TAKEN', `A website with the slug "${patch.slug}" already exists.`)
    }
    const urls = urlColumns(patch.url)
    if (urls?.urlNormalized && urls.urlNormalized !== existing.urlNormalized) {
      const other = await websiteRepo.findByNormalizedUrl(ctx.db, urls.urlNormalized)
      if (other && other.id !== existing.id) throw conflict('WEBSITE_URL_EXISTS', 'Another website already uses this URL.')
    }
    const universeId = patch.universeId ? await universeService.resolveId(ctx, patch.universeId) : undefined
    let orbitAnchorId: string | null | undefined
    if (patch.orbitAnchorId === null) orbitAnchorId = null
    else if (patch.orbitAnchorId) {
      const anchor = await websiteService.resolve(ctx, patch.orbitAnchorId, true)
      if (anchor.id === existing.id) throw badRequest('INVALID_ANCHOR', 'A website cannot orbit itself.')
      orbitAnchorId = anchor.id
    }
    const { tags, orbitAnchorId: _a, url: _url, universeId: _u, ...rest } = patch
    const record = await websiteRepo.update(ctx.db, existing.id, { ...rest, ...(urls ?? {}), ...(universeId ? { universeId } : {}), ...(orbitAnchorId !== undefined ? { orbitAnchorId } : {}) }, tags)
    if (!record) throw WEBSITE_NOT_FOUND()
    ctx.cache.clear()
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'website.update', entityType: 'website', entityId: record.id, details: { fields: Object.keys(patch) } })
    ctx.log.info({ actor: actor.email, website: record.slug, fields: Object.keys(patch) }, 'website updated')
    return toFull(record, await relationshipRepo.forWebsite(ctx.db, record.id))
  },

  async remove(ctx: AppContext, idOrSlug: string, actor: Actor): Promise<void> {
    const existing = await websiteService.resolve(ctx, idOrSlug, true)
    await websiteRepo.remove(ctx.db, existing.id)
    ctx.cache.clear()
    await adminRepo.audit(ctx.db, { adminId: actor.id, action: 'website.delete', entityType: 'website', entityId: existing.id, details: { slug: existing.slug } })
    ctx.log.warn({ actor: actor.email, website: existing.slug }, 'website deleted')
  },

  async stats(ctx: AppContext) {
    return websiteRepo.stats(ctx.db)
  },
}
