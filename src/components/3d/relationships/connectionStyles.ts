import type { RelationshipType } from '../../../types/galaxy'

export type ConnectionStyle = 'continuous' | 'dashed' | 'flow' | 'dotdash' | 'trail'

/**
 * Visual language per relationship type. Pattern and motion carry the
 * distinction (colour is only a tint) so the styles stay distinguishable
 * for everyone; the same mapping feeds the legend.
 */
export const CONNECTION_STYLE: Record<RelationshipType, ConnectionStyle> = {
  related: 'continuous',
  ecosystem: 'continuous',
  'same-company': 'continuous',
  alternative: 'dashed',
  competitor: 'dashed',
  integration: 'flow',
  complementary: 'dotdash',
}

/** Shader pattern index per style. */
export const CONNECTION_PATTERN: Record<ConnectionStyle, number> = { continuous: 0, dashed: 1, flow: 2, dotdash: 3, trail: 4 }

/** Base brightness per type, so the important connections read first. */
export const CONNECTION_STRENGTH: Record<RelationshipType, number> = {
  integration: 0.6,
  related: 0.5,
  alternative: 0.48,
  complementary: 0.46,
  ecosystem: 0.38,
  'same-company': 0.34,
  competitor: 0.28,
}
