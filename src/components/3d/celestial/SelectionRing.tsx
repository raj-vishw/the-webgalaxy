import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, Color, DoubleSide, Group, type Mesh, type MeshBasicMaterial, type Points, type PointsMaterial } from 'three'
import type { CelestialFrameState } from './celestialFrame'

interface SelectionRingProps {
  frame: RefObject<CelestialFrameState>
  color: string
  /** Ring radius in the object's unit space. */
  radius: number
  reducedMotion: boolean
}

const PARTICLES = 18

/**
 * Selection language for a website: a thin tilted orbital ring that hints on
 * hover and settles in on focus, with a few motes travelling along it.
 */
export function SelectionRing({ frame, color, radius, reducedMotion }: SelectionRingProps) {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const motesRef = useRef<Points>(null)
  const tint = useMemo(() => new Color(color).lerp(new Color('#ffffff'), 0.5), [color])

  const motePositions = useMemo(() => {
    const positions = new Float32Array(PARTICLES * 3)
    for (let i = 0; i < PARTICLES; i++) {
      const a = (i / PARTICLES) * Math.PI * 2
      positions[i * 3] = Math.cos(a) * radius
      positions[i * 3 + 2] = Math.sin(a) * radius
    }
    return positions
  }, [radius])

  useFrame((_, delta) => {
    const group = groupRef.current
    const ring = ringRef.current
    const motes = motesRef.current
    if (!group || !ring || !motes) return
    const f = frame.current
    const strength = Math.max(f.hover * 0.35, f.focus)
    const visible = strength > 0.02 && f.visibility > 0.2
    group.visible = visible
    if (!visible) return
    const speed = reducedMotion ? 0.05 : 0.22
    group.rotation.y += delta * speed
    ;(ring.material as MeshBasicMaterial).opacity = 0.55 * strength * f.visibility
    ;(motes.material as PointsMaterial).opacity = 0.9 * f.focus * f.visibility
    motes.visible = f.focus > 0.05
  })

  return (
    <group ref={groupRef} rotation={[0.55, 0, 0.2]} visible={false}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 96]} />
        <meshBasicMaterial color={tint} transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <points ref={motesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={tint} size={0.09} sizeAttenuation transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  )
}
