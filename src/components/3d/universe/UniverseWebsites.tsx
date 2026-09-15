import gsap from 'gsap'
import { useEffect, useMemo } from 'react'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useWebsitesInUniverse } from '../../../store/catalogStore'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition } from '../../../types/galaxy'
import { generateOrbits } from '../../../utils/generateOrbits'
import { generatePositions } from '../../../utils/generatePositions'
import { CelestialObject } from '../celestial/CelestialObject'

interface UniverseWebsitesProps {
  universe: UniverseDefinition
  profile: QualityProfile
  pixelRatio: number
}

const ENTRY_DURATION = 4.4

/**
 * The websites living inside one universe, placed and set in motion
 * procedurally. Rendered in universe-local space (unscaled), so object sizes
 * are in world units. Knows nothing about how each object is drawn.
 */
export function UniverseWebsites({ universe, profile, pixelRatio }: UniverseWebsitesProps) {
  const active = useGalaxyStore((s) => s.activeUniverseId === universe.id)

  const websites = useWebsitesInUniverse(universe.id)
  const orbits = useMemo(() => {
    const positions = generatePositions(universe, websites)
    return generateOrbits(universe, websites, positions)
  }, [universe, websites])

  // Entering the universe replays a staged reveal: stars, then planets, then
  // moons and comets. Leaving restores full visibility for free exploration.
  useEffect(() => {
    if (!active) {
      sceneMotion.universeEntry[universe.id] = 1
      return
    }
    sceneMotion.universeEntry[universe.id] = 0
    const tween = gsap.to(sceneMotion.universeEntry, {
      [universe.id]: 1,
      duration: ENTRY_DURATION,
      ease: 'sine.inOut',
    })
    return () => {
      tween.kill()
      sceneMotion.universeEntry[universe.id] = 1
    }
  }, [active, universe.id])

  return (
    <group position={universe.position as [number, number, number]}>
      {websites.map((website) => {
        const orbit = orbits.get(website.id)
        if (!orbit) return null
        return (
          <CelestialObject
            key={website.id}
            website={website}
            universe={universe}
            orbit={orbit}
            profile={profile}
            pixelRatio={pixelRatio}
          />
        )
      })}
    </group>
  )
}
