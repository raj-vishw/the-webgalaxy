import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition, WebsiteDefinition } from '../../../types/galaxy'
import { ENTRY_REVEAL_WINDOW, fadeDistancesFor, sizeFor } from '../../../utils/celestial'
import { orbitPosition, type OrbitSpec } from '../../../utils/generateOrbits'
import { WebsiteLabel } from '../../ui/WebsiteLabel'
import { WebsiteInteraction } from '../interaction/WebsiteInteraction'
import { createCelestialFrameState } from './celestialFrame'
import { CometTrail } from './CometTrail'
import { CometWebsite } from './CometWebsite'
import { MoonWebsite } from './MoonWebsite'
import { PlanetWebsite } from './PlanetWebsite'
import { StarWebsite } from './StarWebsite'

interface CelestialObjectProps {
  website: WebsiteDefinition
  universe: UniverseDefinition
  orbit: OrbitSpec
  profile: QualityProfile
  pixelRatio: number
}

const HIT_RADIUS: Record<WebsiteDefinition['objectType'], number> = { star: 3.2, planet: 1.6, moon: 2.2, comet: 3 }
const LABEL_GAP_PX = 10

const worldPosition = new Vector3()
const anchorPosition = new Vector3()

/**
 * One website inside a universe. Drives its orbit, distance-based visibility
 * and level of detail, hover / focus easing, and its label; the object type
 * decides which body is drawn.
 */
export function CelestialObject({ website, universe, orbit, profile, pixelRatio }: CelestialObjectProps) {
  const rootRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(createCelestialFrameState())

  const hovered = useGalaxyStore((s) => s.hoveredWebsiteId === website.id)
  const selected = useGalaxyStore((s) => s.selectedWebsiteId === website.id)
  const dimmed = useGalaxyStore(
    (s) => s.selectedWebsiteId !== null && s.selectedWebsiteId !== website.id && s.activeUniverseId === universe.id,
  )

  const size = sizeFor(website)
  const { near, far } = fadeDistancesFor(website, universe)
  const [revealStart, revealEnd] = ENTRY_REVEAL_WINDOW[website.objectType]

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return celestialRegistry.register(website.id, root)
  }, [website.id])

  useFrame(({ camera, size: viewport }, delta) => {
    const root = rootRef.current
    const body = bodyRef.current
    if (!root || !body) return
    const f = frameRef.current

    // Hovering eases the orbit toward a near-stop so the object feels held.
    f.time += delta * (1 - 0.7 * f.hover) * (1 - 0.5 * f.focus)

    if (orbit.kind === 'moon') {
      const anchor = celestialRegistry.get(orbit.anchorId)
      if (anchor) anchorPosition.copy(anchor.position)
      orbitPosition(orbit, f.time, root.position, anchorPosition)
    } else {
      orbitPosition(orbit, f.time, root.position)
    }

    const distance = root.getWorldPosition(worldPosition).distanceTo(camera.position)
    f.distance = distance
    f.size = size
    const entry = sceneMotion.universeEntry[universe.id] ?? 1
    const entryReveal = MathUtils.smoothstep(entry, revealStart, revealEnd)
    f.visibility = (1 - MathUtils.smoothstep(distance, near, far)) * entryReveal
    // Hysteresis so objects don't flicker between detail levels at the boundary.
    const lodDistance = profile.lodDistance * (f.lod === 'full' ? 1.15 : 1)
    f.lod = distance < lodDistance ? 'full' : 'point'

    const k = 1 - Math.exp(-delta * 6)
    f.hover += ((hovered ? 1 : 0) - f.hover) * k
    f.focus += ((selected ? 1 : 0) - f.focus) * k
    f.dim += ((dimmed ? 1 : 0) - f.dim) * k * 0.6

    root.visible = f.visibility > 0.01
    const grow = 0.6 + 0.4 * f.visibility
    body.scale.setScalar(size * grow * (1 + 0.12 * f.hover + 0.1 * f.focus))

    const label = labelRef.current
    if (label) {
      const fov = (camera as PerspectiveCamera).fov * MathUtils.DEG2RAD
      const pxPerUnit = viewport.height / 2 / (distance * Math.tan(fov / 2))
      const extent = website.objectType === 'star' ? size * 2.2 : size * 1.25
      label.style.transform = `translateY(${(extent * pxPerUnit + LABEL_GAP_PX).toFixed(1)}px)`
      label.style.opacity = String(f.visibility)
    }
  }, -1)

  const showLabel = hovered || selected

  return (
    <>
      <group ref={rootRef}>
        <group ref={bodyRef} scale={size}>
          {website.objectType === 'star' && <StarWebsite website={website} frame={frameRef} profile={profile} />}
          {website.objectType === 'planet' && (
            <PlanetWebsite website={website} frame={frameRef} orbit={orbit} profile={profile} />
          )}
          {website.objectType === 'moon' && (
            <MoonWebsite website={website} frame={frameRef} orbit={orbit} profile={profile} />
          )}
          {website.objectType === 'comet' && <CometWebsite website={website} frame={frameRef} profile={profile} />}
          <WebsiteInteraction website={website} radius={HIT_RADIUS[website.objectType]} frame={frameRef} />
        </group>
        {showLabel && (
          <Html center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
            <div ref={labelRef} style={{ opacity: 0 }}>
              <WebsiteLabel name={website.name} selected={selected} />
            </div>
          </Html>
        )}
      </group>
      {orbit.kind === 'comet' && (
        <CometTrail website={website} orbit={orbit} frame={frameRef} pixelRatio={pixelRatio} />
      )}
    </>
  )
}
