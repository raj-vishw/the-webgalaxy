import { useFrame } from '@react-three/fiber'
import { useParallax } from '../../hooks/useParallax'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { labelDeclutter } from '../../lib/labelDeclutter'
import { useUniverses } from '../../store/catalogStore'
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
          profile={profile}
          pixelRatio={pixelRatio}
        />
      ))}
    </group>
  )
}
