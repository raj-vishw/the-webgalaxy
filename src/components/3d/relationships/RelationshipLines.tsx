import { useEffect, useState } from 'react'
import { Color } from 'three'
import { websites } from '../../../data/websites'
import type { VisibleRelationship } from '../../../store/galaxyStore'
import { accentFor } from '../../../utils/celestial'
import { ConnectionLine } from './ConnectionLine'
import { CONNECTION_STRENGTH, CONNECTION_STYLE } from './connectionStyles'

interface RelationshipLinesProps {
  relationships: VisibleRelationship[]
  pixelRatio: number
  reducedMotion: boolean
}

const LEAVE_MS = 650
const websiteById = new Map(websites.map((w) => [w.id, w]))
const tintCache = new Map<string, string>()

/** Tint: the two accents blended, then lifted toward white so lines stay quiet. */
function tintFor(sourceId: string, targetId: string): string {
  const key = `${sourceId}|${targetId}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const s = websiteById.get(sourceId)
  const t = websiteById.get(targetId)
  const color = new Color(s ? accentFor(s) : '#c9d4ff')
  if (t) color.lerp(new Color(accentFor(t)), 0.5)
  const tint = `#${color.lerp(new Color('#ffffff'), 0.55).getHexString()}`
  tintCache.set(key, tint)
  return tint
}

/**
 * The set of connections on screen. Lines that drop out of the set linger
 * briefly while they fade, so a change of focus feels like a hand-over
 * rather than a cut.
 */
export function RelationshipLines({ relationships, pixelRatio, reducedMotion }: RelationshipLinesProps) {
  const [lastRelationships, setLastRelationships] = useState(relationships)
  const [leaving, setLeaving] = useState<VisibleRelationship[]>([])

  if (relationships !== lastRelationships) {
    // Whatever just left the set fades out instead of vanishing.
    setLastRelationships(relationships)
    const wanted = new Set(relationships.map((r) => r.id))
    const gone = new Map<string, VisibleRelationship>()
    for (const r of [...leaving, ...lastRelationships]) if (!wanted.has(r.id)) gone.set(r.id, r)
    setLeaving([...gone.values()])
  }

  useEffect(() => {
    if (!leaving.length) return
    const timer = window.setTimeout(() => setLeaving([]), LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  const line = (r: VisibleRelationship, isLeaving: boolean) => (
    <ConnectionLine
      key={r.id}
      fromId={r.sourceId}
      toId={r.targetId}
      style={CONNECTION_STYLE[r.type]}
      directed={r.directed}
      color={tintFor(r.sourceId, r.targetId)}
      strength={CONNECTION_STRENGTH[r.type]}
      leaving={isLeaving}
      pixelRatio={pixelRatio}
      reducedMotion={reducedMotion}
    />
  )

  return (
    <>
      {relationships.map((r) => line(r, false))}
      {leaving.map((r) => line(r, true))}
    </>
  )
}
