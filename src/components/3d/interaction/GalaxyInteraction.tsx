import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Intersection } from 'three'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import { interactionTagOf, rankInteraction } from '../../../utils/interaction'

interface GalaxyInteractionProps {
  reducedMotion: boolean
}

/**
 * Scene-wide interaction policy. Only tagged hit volumes carry handlers, so
 * raycasts never touch particles or bodies; when volumes overlap, hits are
 * re-ranked so the selected website wins over other websites, which win over
 * universes. Also applies the motion preference to the shared motion state.
 */
export function GalaxyInteraction({ reducedMotion }: GalaxyInteractionProps) {
  const setEvents = useThree((s) => s.setEvents)

  useEffect(() => {
    setEvents({
      filter: (hits: Intersection[]) => {
        const selected = useGalaxyStore.getState().selectedWebsiteId
        return hits
          .map((hit, index) => ({ hit, index, rank: rankInteraction(interactionTagOf(hit.object), selected) }))
          .sort((a, b) => a.rank - b.rank || a.index - b.index)
          .map((entry) => entry.hit)
      },
    })
  }, [setEvents])

  useEffect(() => {
    sceneMotion.motionScale = reducedMotion ? 0.3 : 1
  }, [reducedMotion])

  return null
}
