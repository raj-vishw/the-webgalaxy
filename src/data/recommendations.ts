import type { RelationshipType, UniverseAffinity } from '../types/galaxy'

/**
 * Tunables for the deterministic recommendation scorer, kept as data so they
 * can be adjusted (or served by a backend) without touching the algorithm.
 */

/** How strongly each relationship type pulls a candidate toward the current website. */
export const RELATIONSHIP_WEIGHT: Record<RelationshipType, number> = {
  integration: 30,
  related: 26,
  alternative: 22,
  complementary: 20,
  ecosystem: 16,
  'same-company': 12,
  competitor: 10,
}

/** Upper bounds of each scoring signal; the sum is the normalisation ceiling. */
export const SIGNAL_MAX = {
  relationship: 30,
  historyRelationship: 12,
  tags: 20,
  universe: 12,
  session: 10,
  popularity: 8,
  objectType: 3,
  trending: 6,
} as const

/**
 * Universes whose websites often interest the same explorer. An affinity is
 * a hint about where to look next — the universes stay fully independent.
 */
export const universeAffinities: UniverseAffinity[] = [
  { universeIds: ['ai', 'development'], reason: 'AI tools are built and shared as code' },
  { universeIds: ['ai', 'science'], reason: 'Research papers and the models behind them' },
  { universeIds: ['ai', 'education'], reason: 'Learning with and about AI' },
  { universeIds: ['cybersecurity', 'development'], reason: 'Secure software and infrastructure' },
  { universeIds: ['cybersecurity', 'education'], reason: 'Hands-on security learning' },
  { universeIds: ['design', 'development'], reason: 'Designs become shipped websites' },
  { universeIds: ['gaming', 'entertainment'], reason: 'Play, streams and video' },
  { universeIds: ['music', 'entertainment'], reason: 'Streaming media' },
  { universeIds: ['science', 'education'], reason: 'Open knowledge and courses' },
  { universeIds: ['finance', 'education'], reason: 'Learning to invest' },
]
