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
  { universeIds: ['technology', 'development'], reason: 'Hardware, internet and the code on top' },
  { universeIds: ['arts', 'design'], reason: 'Visual culture and craft' },
  { universeIds: ['arts', 'music'], reason: 'The performing arts' },
  { universeIds: ['news', 'society'], reason: 'What is happening and why' },
  { universeIds: ['news', 'finance'], reason: 'Markets in the headlines' },
  { universeIds: ['business', 'finance'], reason: 'Enterprise and its money' },
  { universeIds: ['business', 'shopping'], reason: 'Brands and where to buy them' },
  { universeIds: ['health', 'science'], reason: 'Medicine and research' },
  { universeIds: ['health', 'food'], reason: 'Eating well' },
  { universeIds: ['food', 'home'], reason: 'The kitchen and the household' },
  { universeIds: ['home', 'shopping'], reason: 'Furnishing everyday life' },
  { universeIds: ['travel', 'recreation'], reason: 'Getting out there' },
  { universeIds: ['sports', 'recreation'], reason: 'Play and the outdoors' },
  { universeIds: ['kids', 'education'], reason: 'Learning young' },
  { universeIds: ['reference', 'education'], reason: 'Looking things up' },
  { universeIds: ['reference', 'science'], reason: 'Knowledge and its sources' },
  { universeIds: ['entertainment', 'arts'], reason: 'Screen and stage' },
  { universeIds: ['productivity', 'development'], reason: 'The tools of the trade' },
  { universeIds: ['productivity', 'business'], reason: 'How work gets done' },
  { universeIds: ['crypto', 'finance'], reason: 'Money, old and new' },
  { universeIds: ['crypto', 'development'], reason: 'Protocols are open source' },
  { universeIds: ['startups', 'business'], reason: 'Companies at every stage' },
  { universeIds: ['startups', 'productivity'], reason: 'Small teams, sharp tools' },
  { universeIds: ['software', 'development'], reason: 'Built and shipped' },
  { universeIds: ['internet', 'communities'], reason: 'Where people gather online' },
  { universeIds: ['government', 'society'], reason: 'Institutions and the public' },
  { universeIds: ['medicine', 'health'], reason: 'Care and wellbeing' },
  { universeIds: ['museums', 'reference'], reason: 'Collections and knowledge' },
  { universeIds: ['nature', 'science'], reason: 'The living planet' },
  { universeIds: ['hardware', 'technology'], reason: 'Silicon and systems' },
  { universeIds: ['fashion', 'shopping'], reason: 'Style and where to find it' },
  { universeIds: ['literature', 'arts'], reason: 'Words and craft' },
  { universeIds: ['religion', 'society'], reason: 'Belief and community' },
  { universeIds: ['vehicles', 'recreation'], reason: 'On the road and off it' },
]
