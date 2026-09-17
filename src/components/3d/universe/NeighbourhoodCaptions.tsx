import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, Vector3 } from 'three'
import { createLabelBox, measureLabel, type LabelBox } from '../../../lib/labelBox'
import { labelDeclutter } from '../../../lib/labelDeclutter'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition } from '../../../types/galaxy'
import type { Neighbourhood } from '../../../utils/generatePositions'

interface NeighbourhoodCaptionsProps {
  universe: UniverseDefinition
  neighbourhoods: Neighbourhood[]
}

const worldPosition = new Vector3()
const screenPosition = new Vector3()

/**
 * Faint captions naming the topic neighbourhoods of the entered universe —
 * a map legend drawn in the scene. They sit above each cluster, give way to
 * website names in the declutter pass, fade while a website is focused, and
 * never claim any rank: a neighbourhood is a grouping, not a level.
 */
export function NeighbourhoodCaptions({ universe, neighbourhoods }: NeighbourhoodCaptionsProps) {
  const groupRef = useRef<Group>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const eased = useRef<number[]>([])
  const boxes = useRef<LabelBox[]>([])
  const focused = useGalaxyStore((s) => s.viewMode === 'website')

  useEffect(() => () => neighbourhoods.forEach((n) => labelDeclutter.remove(`topic:${universe.id}:${n.topic}`)), [neighbourhoods, universe.id])

  useFrame(({ camera, size }, delta) => {
    const group = groupRef.current
    if (!group) return
    const entry = sceneMotion.universeEntry[universe.id] ?? 1
    const k = 1 - Math.exp(-delta * 5)
    neighbourhoods.forEach((n, i) => {
      const label = labelRefs.current[i]
      if (!label) return
      worldPosition.set(n.centre[0], n.centre[1] + n.radius * 1.25, n.centre[2])
      group.localToWorld(worldPosition)
      screenPosition.copy(worldPosition).project(camera)
      const behind = screenPosition.z > 1
      const id = `topic:${universe.id}:${n.topic}`
      const box = measureLabel((boxes.current[i] ??= createLabelBox(n.topic.toUpperCase(), i * 17, 9, 12)), label)
      labelDeclutter.report(id, {
        x: ((screenPosition.x + 1) / 2) * size.width,
        y: ((1 - screenPosition.y) / 2) * size.height,
        halfWidth: box.width / 2,
        halfHeight: box.height / 2,
        priority: behind ? -20 : 0.2,
      })
      const target = behind || labelDeclutter.isHidden(id) || focused ? 0 : 1
      eased.current[i] = (eased.current[i] ?? 0) + (target - (eased.current[i] ?? 0)) * k
      label.style.opacity = String(MathUtils.smoothstep(entry, 0.35, 0.8) * eased.current[i] * sceneMotion.labelReveal)
    })
  }, -1)

  return (
    <group ref={groupRef}>
      {neighbourhoods.map((n, i) => (
        <group key={n.topic} position={[n.centre[0], n.centre[1] + n.radius * 1.25, n.centre[2]]}>
          <Html center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
            <div
              ref={(el) => {
                labelRefs.current[i] = el
              }}
              style={{ opacity: 0 }}
              className="select-none whitespace-nowrap font-sans text-[10px] tracking-[0.3em] uppercase text-space-300/70"
            >
              {n.topic}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}
