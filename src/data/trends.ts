import type { WebsiteTrend } from '../types/galaxy'

/**
 * Static demo trend snapshot.
 *
 * Nothing here is measured: these are hand-written placeholder values shaped
 * like the records a future backend would return (a score, a direction, an
 * `asOf` date). `emerging` marks lower-prominence websites with high
 * discovery potential. Do not present any of this as live traffic.
 */
export const TRENDS_AS_OF = '2026-09-01'

export const trends: WebsiteTrend[] = [
  { websiteId: 'claude', trendingScore: 0.92, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'cursor', trendingScore: 0.9, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'perplexity', trendingScore: 0.64, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'huggingface', trendingScore: 0.6, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'tryhackme', trendingScore: 0.72, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'letterboxd', trendingScore: 0.66, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'framer', trendingScore: 0.58, trendDirection: 'up', asOf: TRENDS_AS_OF },
  { websiteId: 'hackthebox', trendingScore: 0.5, trendDirection: 'steady', asOf: TRENDS_AS_OF },
  { websiteId: 'ollama', trendingScore: 0.7, trendDirection: 'up', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'railway', trendingScore: 0.55, trendDirection: 'up', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'penpot', trendingScore: 0.5, trendDirection: 'up', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'openrouter', trendingScore: 0.5, trendDirection: 'up', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'render', trendingScore: 0.45, trendDirection: 'steady', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'haveibeenpwned', trendingScore: 0.42, trendDirection: 'up', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'owasp', trendingScore: 0.4, trendDirection: 'steady', emerging: true, asOf: TRENDS_AS_OF },
  { websiteId: 'bandcamp', trendingScore: 0.3, trendDirection: 'down', asOf: TRENDS_AS_OF },
]

/** Websites at or above this score are "trending". */
export const TRENDING_THRESHOLD = 0.55
