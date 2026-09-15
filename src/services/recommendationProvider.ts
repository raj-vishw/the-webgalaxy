import type { WebsiteDefinition } from '../types/galaxy'
import {
  getEmergingWebsites,
  getRecommendations,
  getSimilarWebsites,
  getTrendingWebsites,
  type Recommendation,
  type RecommendationContext,
} from './recommendationService'

/**
 * The recommendation boundary the UI and store depend on. The default is
 * the deterministic local scorer; an API- or AI-backed implementation can
 * be swapped in with `setRecommendationProvider` without touching the UI —
 * results may be sync or async.
 */
export interface RecommendationProvider {
  readonly name: string
  recommend(ctx: RecommendationContext, limit: number, exclude: Iterable<string>): Recommendation[] | Promise<Recommendation[]>
  similar(websiteId: string, limit: number): Recommendation[] | Promise<Recommendation[]>
  trending(limit: number): WebsiteDefinition[] | Promise<WebsiteDefinition[]>
  emerging(limit: number): WebsiteDefinition[] | Promise<WebsiteDefinition[]>
}

export const localRecommendationProvider: RecommendationProvider = {
  name: 'local',
  recommend: (ctx, limit, exclude) => getRecommendations(ctx, limit, exclude),
  similar: (websiteId, limit) => getSimilarWebsites(websiteId, limit),
  trending: (limit) => getTrendingWebsites(limit),
  emerging: (limit) => getEmergingWebsites(limit),
}

let active: RecommendationProvider = localRecommendationProvider

export const getRecommendationProvider = () => active

export function setRecommendationProvider(provider: RecommendationProvider) {
  active = provider
}
