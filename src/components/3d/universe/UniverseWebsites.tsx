import gsap from 'gsap'
import { useEffect, useMemo } from 'react'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useWebsitesInUniverse } from '../../../store/catalogStore'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition } from '../../../types/galaxy'
import { importanceFor } from '../../../utils/celestial'
import { generateOrbits } from '../../../utils/generateOrbits'
import { generatePositions } from '../../../utils/generatePositions'
import { CelestialObject } from '../celestial/CelestialObject'
import { WebsitePoints } from './WebsitePoints'

interface UniverseWebsitesProps {
  universe: UniverseDefinition
  profile: QualityProfile
  pixelRatio: number
}

const ENTRY_DURATION = 4.4

/**
 * The websites living inside one universe, placed and set in motion
 * procedurally. Rendered in universe-local space (unscaled), so object sizes
 * are in world units.
 *
 * Detail is budgeted: the entered universe draws full celestial objects for
 * its most prominent websites (up to `profile.maxDetailed`); everywhere else
 * a website is a point in the universe's cloud unless it is specifically
 * relevant right now (selected, hovered, highlighted, or at the end of a
 * drawn connection). That keeps the scene affordable at 1,000+ websites.
 */
export function UniverseWebsites({ universe, profile, pixelRatio }: UniverseWebsitesProps) {
  const active = useGalaxyStore((s) => s.activeUniverseId === universe.id)
  const websites = useWebsitesInUniverse(universe.id)
  // Websites that must be full objects regardless of budget, as one stable key.
  const pinnedKey = useGalaxyStore((s) => {
    const ids = new Set<string>()
    if (s.selectedWebsiteId) ids.add(s.selectedWebsiteId)
    if (s.hoveredWebsiteId) ids.add(s.hoveredWebsiteId)
    for (const r of s.visibleRelationships) {
      ids.add(r.sourceId)
      ids.add(r.targetId)
    }
    for (const item of s.highlight?.items ?? []) ids.add(item.website.id)
    if (s.discovery.phase !== 'idle' && s.discovery.mode !== 'universe') {
      if (s.discovery.candidateId) ids.add(s.discovery.candidateId)
      if (s.discovery.targetId) ids.add(s.discovery.targetId)
    }
    return [...ids].filter((id) => websites.some((w) => w.id === id)).sort().join('|')
  })

  const orbits = useMemo(() => {
    const positions = generatePositions(universe, websites)
    return generateOrbits(universe, websites, positions)
  }, [universe, websites])

  const { detailed, pointed } = useMemo(() => {
    const pinned = new Set(pinnedKey ? pinnedKey.split('|') : [])
    const budget = active ? profile.maxDetailed : 0
    const byProminence = [...websites].sort((a, b) => importanceFor(b) - importanceFor(a))
    const detailedIds = new Set<string>(pinned)
    for (const w of byProminence) {
      if (detailedIds.size >= budget + pinned.size) break
      detailedIds.add(w.id)
    }
    // Moons need their anchor as a full object to orbit it; keep pairs together.
    for (const w of websites) if (detailedIds.has(w.id) && w.orbitAnchorId && !detailedIds.has(w.orbitAnchorId)) detailedIds.add(w.orbitAnchorId)
    return {
      detailed: websites.filter((w) => detailedIds.has(w.id)),
      pointed: websites.filter((w) => !detailedIds.has(w.id)),
    }
  }, [websites, active, pinnedKey, profile.maxDetailed])

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
      {detailed.map((website) => {
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
      <WebsitePoints universe={universe} websites={pointed} orbits={orbits} pixelRatio={pixelRatio} />
    </group>
  )
}
