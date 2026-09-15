import { useGalaxyStore } from '../../../store/galaxyStore'
import { RelationshipLines } from './RelationshipLines'

interface RelationshipGraphProps {
  pixelRatio: number
  reducedMotion: boolean
}

/**
 * Connections of the focused website (or of the active highlight set). The
 * store decides *which* connections are relevant — at most a handful — and
 * nothing is drawn while no website is focused, so the galaxy stays clean.
 * Re-renders only when the set changes, never per frame.
 */
export function RelationshipGraph({ pixelRatio, reducedMotion }: RelationshipGraphProps) {
  const relationships = useGalaxyStore((s) => s.visibleRelationships)
  return <RelationshipLines relationships={relationships} pixelRatio={pixelRatio} reducedMotion={reducedMotion} />
}
