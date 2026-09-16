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
import { NeighbourhoodCaptions } from './NeighbourhoodCaptions'
import { WebsitePoints } from './WebsitePoints'

interface UniverseWebsitesProps {
  universe: UniverseDefinition
  profile: QualityProfile
  pixelRatio: number
}

const ENTRY_DURATION = 4.4
/**
 * Inside the entered universe only its most prominent websites are full
 * bodies; the rest stay bright, hoverable points until they matter. Fewer on
 * lower tiers.
 */
const DETAILED_IN_UNIVERSE: Record<QualityProfile['tier'], number> = { high: 16, medium: 12, low: 8 }
/** How many of those carry a permanent name. */
const NAMED_IN_UNIVERSE: Record<QualityProfile['tier'], number> = { high: 8, medium: 6, low: 4 }

/**
 * The websites living inside one universe, placed and set in motion
 * procedurally. Rendered in universe-local space (unscaled), so object sizes
 * are in world units.
 *
 * Detail is tiered: the entered universe draws full celestial objects for
 * its most prominent websites (`DETAILED_IN_UNIVERSE`, within the graphics
 * profile's overall budget) and names the top few; every other website is a
 * point in the universe's cloud unless it is specifically relevant right now
 * (selected, hovered, highlighted, or at the end of a drawn connection).
 * That keeps the scene affordable and legible at 1,000+ websites.
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

  const placement = useMemo(() => generatePositions(universe, websites), [universe, websites])
  const orbits = useMemo(
    () => generateOrbits(universe, websites, placement.positions, placement.interior),
    [universe, websites, placement],
  )

  const { detailed, pointed, named } = useMemo(() => {
    const pinned = new Set(pinnedKey ? pinnedKey.split('|') : [])
    const budget = active ? Math.min(profile.maxDetailed, DETAILED_IN_UNIVERSE[profile.tier]) : 0
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
      named: new Set(active ? byProminence.slice(0, NAMED_IN_UNIVERSE[profile.tier]).map((w) => w.id) : []),
    }
  }, [websites, active, pinnedKey, profile.maxDetailed, profile.tier])

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
            interior={placement.interior}
            named={named.has(website.id)}
          />
        )
      })}
      <WebsitePoints universe={universe} websites={pointed} orbits={orbits} pixelRatio={pixelRatio} interior={placement.interior} interactive={active} />
      {active && <NeighbourhoodCaptions universe={universe} neighbourhoods={placement.neighbourhoods} />}
    </group>
  )
}
