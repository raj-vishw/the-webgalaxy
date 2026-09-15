import { useParallax } from '../../hooks/useParallax'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { universes } from '../../data/universes'
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
