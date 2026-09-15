import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { buildUniverseGeometry } from '../../../lib/universeGeometry'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition } from '../../../types/galaxy'
import { UniverseLabel } from '../../ui/UniverseLabel'
import { UniverseInteraction } from '../interaction/UniverseInteraction'
import { GlowSprites } from '../visuals/GlowSprites'
import { OrbitingBodies } from '../visuals/OrbitingBodies'
import { UniverseParticles } from '../visuals/UniverseParticles'
import { createUniverseFrameState, type UniverseFrameState } from '../visuals/universeFrame'
import { UniverseContents } from './UniverseContents'

interface UniverseProps {
  definition: UniverseDefinition
  /** Start of this universe's reveal window within the intro (0–1). */
  revealOffset: number
  profile: QualityProfile
  pixelRatio: number
}

const HOVER_SCALE = 1.06
const REVEAL_WINDOW = 0.45
/** How much the structure fades while one of its websites is focused. */
const DIM_AMOUNT = 0.55
/** How much the structure fades once the camera is inside it, so websites read clearly. */
const PROXIMITY_DIM = 0.5
/** How much non-active universes recede while another is entered. */
const DISTANT_DIM = 0.3
/** Gap between the structure's projected edge and its label, in CSS pixels. */
const LABEL_GAP_PX = 12

const worldPosition = new Vector3()

/**
 * One independent region of The WebGalaxy: the cosmic structure that gives it
 * an identity, the websites living inside it, and its ambient environment.
 * Owns hover / active / dim easing, the reveal progression and the slow spin;
 * delegates drawing to the visual children.
 */
export function Universe({ definition, revealOffset, profile, pixelRatio }: UniverseProps) {
  const rootRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<UniverseFrameState>(createUniverseFrameState())
  const [hovered, setHovered] = useState(false)
  const active = useGalaxyStore((s) => s.activeUniverseId === definition.id)
  const dimmed = useGalaxyStore((s) => s.activeUniverseId === definition.id && s.selectedWebsiteId !== null)
  // Other universes recede a little while one is entered — still present, just quieter.
  const distant = useGalaxyStore((s) => s.viewMode !== 'galaxy' && s.activeUniverseId !== definition.id)

  const geometry = useMemo(
    () => buildUniverseGeometry(definition, profile.universeDetail),
    [definition, profile.universeDetail],
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return celestialRegistry.register(definition.id, root)
  }, [definition.id])

  useFrame(({ camera, size }, delta) => {
    const root = rootRef.current
    const spin = spinRef.current
    if (!root || !spin) return
    const frame = frameRef.current

    frame.reveal = MathUtils.smoothstep(sceneMotion.universeReveal, revealOffset, revealOffset + REVEAL_WINDOW)
    const distance = root.getWorldPosition(worldPosition).distanceTo(camera.position)
    const proximity = 1 - MathUtils.smoothstep(distance, definition.scale * 2, definition.scale * 4.5)
    const k = 1 - Math.exp(-delta * 5)
    // A freshly selected universe brightens and swells slightly until the
    // camera is inside it, where the proximity dim takes over.
    const selectedBoost = active ? 0.6 * (1 - proximity) : 0
    frame.hover += (Math.max(hovered && !active ? 1 : 0, selectedBoost) - frame.hover) * k
    const dimTarget = Math.max(dimmed ? DIM_AMOUNT : 0, proximity * PROXIMITY_DIM, distant ? DISTANT_DIM : 0)
    frame.dim += (dimTarget - frame.dim) * k * 0.6

    const scale = definition.scale * (1 + (HOVER_SCALE - 1) * frame.hover)
    root.scale.setScalar(scale)
    spin.rotation.y += geometry.spinSpeed * delta * sceneMotion.motionScale

    const label = labelRef.current
    if (label) {
      // Anchor the label just below the structure in *screen* space so it never
      // lands on the bright core, whatever the camera angle or zoom. It also
      // gives way as the camera approaches, where the websites take over.
      const fov = (camera as PerspectiveCamera).fov * MathUtils.DEG2RAD
      const pxPerUnit = size.height / 2 / (distance * Math.tan(fov / 2))
      const offset = scale * pxPerUnit + LABEL_GAP_PX
      const proximityFade = MathUtils.smoothstep(distance, definition.scale * 3.2, definition.scale * 5)
      label.style.opacity = String(frame.reveal * proximityFade)
      label.style.transform = `translateY(${offset.toFixed(1)}px)`
    }
  }, -1)

  return (
    <>
      <group ref={rootRef} position={definition.position as [number, number, number]}>
        <group rotation={geometry.orientation as [number, number, number]}>
          <group ref={spinRef}>
            <UniverseParticles geometry={geometry} frame={frameRef} pixelRatio={pixelRatio} />
            {geometry.bodies && <OrbitingBodies bodies={geometry.bodies} frame={frameRef} pixelRatio={pixelRatio} />}
            <GlowSprites glows={geometry.glows} frame={frameRef} />
          </group>
        </group>

        <UniverseInteraction definition={definition} enabled={!active} onHoverChange={setHovered} />

        <Html center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={labelRef} style={{ opacity: 0 }}>
            <UniverseLabel name={definition.name} hovered={hovered && !active} />
          </div>
        </Html>
      </group>

      <UniverseContents universe={definition} profile={profile} pixelRatio={pixelRatio} />
    </>
  )
}
