import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { useParallax } from '../../hooks/useParallax'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { labelDeclutter } from '../../lib/labelDeclutter'
import { sceneMotion } from '../../lib/sceneMotion'
import { useUniverses } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { Universe } from './universe/Universe'

interface UniverseFieldProps {
  profile: QualityProfile
  pixelRatio: number
}

/** Fraction of the reveal window over which universes start appearing. */
const STAGGER_SPAN = 0.55

/**
 * Places every universe into the shared galaxy. All universes are siblings —
 * there is no grouping or nesting between them.
 */
export function UniverseField({ profile, pixelRatio }: UniverseFieldProps) {
  const groupRef = useParallax(1.2)
  const universes = useUniverses()
  // A galaxy of many universes spends its particle budget more thinly per
  // universe, so the overview stays smooth however many there are.
  const crowd = Math.min(1, Math.max(0.55, Math.sqrt(24 / Math.max(1, universes.length))))
  const fieldProfile = useMemo(
    () => ({ ...profile, universeDetail: profile.universeDetail * crowd, dustDetail: profile.dustDetail * crowd }),
    [profile, crowd],
  )
  // The universes wander slowly while the galaxy is viewed as a whole; the
  // moment one is entered the clock pauses so it sits still under the camera.
  useFrame((_, delta) => {
    if (useGalaxyStore.getState().viewMode === 'galaxy') sceneMotion.driftTime += delta * sceneMotion.motionScale
  }, -2)
  // Universes report their label rectangles at priority -1; decide overlaps
  // once they all have, so every label reads the verdict next frame.
  useFrame(() => labelDeclutter.resolve(), 0)
  return (
    <group ref={groupRef}>
      {universes.map((definition, index) => (
        <Universe
          key={definition.id}
          definition={definition}
          revealOffset={(index / universes.length) * STAGGER_SPAN}
          profile={fieldProfile}
          pixelRatio={pixelRatio}
        />
      ))}
    </group>
  )
}
