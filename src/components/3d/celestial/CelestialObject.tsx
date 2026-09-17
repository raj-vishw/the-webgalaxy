import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { labelDeclutter } from '../../../lib/labelDeclutter'
import { measureLabel } from '../../../lib/labelBox'
import type { LogoAtlas } from '../../../lib/logoAtlas'
import { sceneMotion } from '../../../lib/sceneMotion'
import { isEmerging, isTrending } from '../../../services/recommendationService'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition, WebsiteDefinition } from '../../../types/galaxy'
import { ENTRY_REVEAL_WINDOW, accentFor, fadeDistancesFor, hashString, sizeFor } from '../../../utils/celestial'
import { orbitPosition, type OrbitSpec } from '../../../utils/generateOrbits'
import { WebsiteLabel } from '../../ui/WebsiteLabel'
import { WebsiteInteraction } from '../interaction/WebsiteInteraction'
import { createCelestialFrameState } from './celestialFrame'
import { CometTrail } from './CometTrail'
import { CometWebsite } from './CometWebsite'
import { Emblem } from './Emblem'
import { MoonWebsite } from './MoonWebsite'
import { PlanetWebsite } from './PlanetWebsite'
import { SelectionRing } from './SelectionRing'
import { StarWebsite } from './StarWebsite'
import { TrendMarker } from './TrendMarker'

interface CelestialObjectProps {
  website: WebsiteDefinition
  universe: UniverseDefinition
  orbit: OrbitSpec
  profile: QualityProfile
  pixelRatio: number
  /** Interior growth of the universe for its population (see `interiorScale`). */
  interior?: number
  /** Carries a permanent name inside the entered universe (top few by prominence). */
  named?: boolean
  /** Icon atlas of the universe, when loaded; the site wears its icon as an emblem. */
  atlas?: LogoAtlas | null
}

const HIT_RADIUS: Record<WebsiteDefinition['objectType'], number> = { star: 3.2, planet: 1.6, moon: 2.2, comet: 3 }
const RING_RADIUS: Record<WebsiteDefinition['objectType'], number> = { star: 2.6, planet: 1.55, moon: 1.7, comet: 2.4 }
const LABEL_GAP_PX = 10
/** Camera distance (× size) under which the close-up detail level kicks in. */
const DETAIL_FACTOR = 22

const worldPosition = new Vector3()
const anchorPosition = new Vector3()
const screenPosition = new Vector3()

/**
 * One website inside a universe. Drives its orbit, distance-based visibility
 * and level of detail, hover / focus easing, and its label; the object type
 * decides which body is drawn.
 */
export function CelestialObject({ website, universe, orbit, profile, pixelRatio, interior = 1, named = false, atlas = null }: CelestialObjectProps) {
  const emblem = !!atlas && atlas.slotOf(website.id) >= 0
  const rootRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(createCelestialFrameState(website.name, hashString(website.id)))

  const hovered = useGalaxyStore((s) => s.hoveredWebsiteId === website.id)
  const selected = useGalaxyStore((s) => s.selectedWebsiteId === website.id)
  const dimmed = useGalaxyStore(
    (s) => s.selectedWebsiteId !== null && s.selectedWebsiteId !== website.id && s.activeUniverseId === universe.id,
  )
  // At the far end of a drawn connection: named, so the line reads as "GitHub — GitLab".
  const linked = useGalaxyStore(
    (s) => s.selectedWebsiteId !== website.id && s.visibleRelationships.some((r) => r.sourceId === website.id || r.targetId === website.id),
  )
  const trend = isTrending(website.id) ? 'trending' : isEmerging(website.id) ? 'emerging' : null

  const size = sizeFor(website)
  const { near, far } = fadeDistancesFor(website, universe, interior)
  const [revealStart, revealEnd] = ENTRY_REVEAL_WINDOW[website.objectType]

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return celestialRegistry.register(website.id, root)
  }, [website.id])

  useEffect(() => () => labelDeclutter.remove(`w:${website.id}`), [website.id])

  useFrame(({ camera, size: viewport }, delta) => {
    const root = rootRef.current
    const body = bodyRef.current
    if (!root || !body) return
    const f = frameRef.current

    // Hovering eases the orbit toward a near-stop so the object feels held;
    // focus and being a dimmed neighbour calm the motion further.
    f.time += delta * sceneMotion.motionScale * (1 - 0.7 * f.hover) * (1 - 0.85 * f.focus) * (1 - 0.4 * f.dim)

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
    // Search / discovery / travel emphasis and filters are read straight from
    // the shared motion state so they cost no React renders.
    const { emphasis, filter, relations } = sceneMotion
    const emphasized = emphasis.active && emphasis.websiteIds.has(website.id)
    const connected = relations.active && relations.websiteIds.has(website.id)
    const filteredOut = filter.active && !filter.websiteIds.has(website.id)

    // The staggered entry reveal never hides what the explorer is heading
    // for: the focused, emphasised or connected object is present at once.
    const entry = sceneMotion.universeEntry[universe.id] ?? 1
    const entryReveal = selected || emphasized || connected ? 1 : MathUtils.smoothstep(entry, revealStart, revealEnd)
    f.visibility = (1 - MathUtils.smoothstep(distance, near, far)) * entryReveal
    // Hysteresis so objects don't flicker between detail levels at the boundary.
    // A grown interior is viewed from further away; the body must still be a body there.
    const lodDistance = profile.lodDistance * interior * sceneMotion.universeFraming * (f.lod === 'point' ? 1 : 1.15)
    const detailDistance = size * DETAIL_FACTOR * (f.lod === 'detail' ? 1.15 : 1)
    f.lod = distance < detailDistance ? 'detail' : distance < lodDistance ? 'full' : 'point'

    if (emphasized) f.visibility = Math.max(f.visibility, entryReveal * 0.85)
    else if (emphasis.active) f.visibility *= 1 - emphasis.dimOthers
    // Far ends of connections stay present even from across the galaxy.
    if (connected) f.visibility = Math.max(f.visibility, entryReveal * 0.6)
    if (filteredOut) f.visibility *= 0.15

    const k = 1 - Math.exp(-delta * 6)
    f.hover += (Math.max(hovered ? 1 : 0, emphasized ? 0.7 : 0, connected && !selected ? 0.3 : 0) - f.hover) * k
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
      const offset = extent * pxPerUnit + LABEL_GAP_PX
      // Permanent names share the declutter pass with universe labels and
      // topic captions; the focused and hovered names always win.
      screenPosition.copy(worldPosition).project(camera)
      const box = measureLabel(f.labelBox, label)
      labelDeclutter.report(`w:${website.id}`, {
        x: ((screenPosition.x + 1) / 2) * viewport.width,
        y: ((1 - screenPosition.y) / 2) * viewport.height + offset,
        halfWidth: box.width / 2,
        halfHeight: box.height / 2,
        priority: selected ? 10 : hovered ? 9 : linked ? 6 : 3 + (website.importance ?? 50) / 100,
      })
      const cleared = selected || hovered || !labelDeclutter.isHidden(`w:${website.id}`)
      f.label += ((cleared ? 1 : 0) - f.label) * k
      label.style.transform = `translateY(${offset.toFixed(1)}px)`
      label.style.opacity = String(f.visibility * f.label * (hovered || selected ? 1 : named && !linked ? 0.8 : 0.7))
    } else {
      labelDeclutter.remove(`w:${website.id}`)
    }
  }, -1)

  const showLabel = hovered || selected || linked || named

  return (
    <>
      <group ref={rootRef}>
        <group ref={bodyRef} scale={size}>
          {website.objectType === 'star' && <StarWebsite website={website} frame={frameRef} profile={profile} emblem={emblem} />}
          {website.objectType === 'planet' && (
            <PlanetWebsite website={website} frame={frameRef} orbit={orbit} profile={profile} />
          )}
          {website.objectType === 'moon' && (
            <MoonWebsite website={website} frame={frameRef} orbit={orbit} profile={profile} />
          )}
          {website.objectType === 'comet' && <CometWebsite website={website} frame={frameRef} profile={profile} emblem={emblem} />}
          <WebsiteInteraction website={website} radius={HIT_RADIUS[website.objectType]} frame={frameRef} />
          <SelectionRing
            frame={frameRef}
            color={accentFor(website)}
            radius={RING_RADIUS[website.objectType]}
            reducedMotion={profile.reducedMotion}
          />
          {trend && profile.tier !== 'low' && (
            <TrendMarker kind={trend} websiteId={website.id} frame={frameRef} color={accentFor(website)} reducedMotion={profile.reducedMotion} />
          )}
        </group>
        {emblem && atlas && <Emblem website={website} atlas={atlas} frame={frameRef} size={size} />}
        {showLabel && (
          <Html center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
            <div ref={labelRef} style={{ opacity: 0 }}>
              <WebsiteLabel name={website.name} selected={selected} muted={(linked || named) && !hovered && !selected} />
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
