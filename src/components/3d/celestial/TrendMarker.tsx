import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, Color, Group, type Points, type PointsMaterial, type Sprite } from 'three'
import { hashString } from '../../../utils/celestial'
import type { CelestialFrameState } from './celestialFrame'
import { ObjectGlow } from './ObjectGlow'

interface TrendMarkerProps {
  kind: 'trending' | 'emerging'
  websiteId: string
  frame: RefObject<CelestialFrameState>
  color: string
  reducedMotion: boolean
}

const SPARKS = 7

/**
 * Subtle visual difference for websites in the static trend snapshot:
 * trending → a slow, wide breathing glow; emerging → a few faint sparks
 * drifting around the body. Both are meant to be noticed, not to dominate,
 * and neither changes the object's size.
 */
export function TrendMarker({ kind, websiteId, frame, color, reducedMotion }: TrendMarkerProps) {
  const glowRef = useRef<Sprite>(null)
  const sparksRef = useRef<Points>(null)
  const groupRef = useRef<Group>(null)
  const phase = useMemo(() => ((hashString(websiteId) % 1000) / 1000) * Math.PI * 2, [websiteId])
  const tint = useMemo(() => new Color(color).lerp(new Color('#ffffff'), 0.6), [color])

  const sparkPositions = useMemo(() => {
    const positions = new Float32Array(SPARKS * 3)
    for (let i = 0; i < SPARKS; i++) {
      const a = (i / SPARKS) * Math.PI * 2
      const r = 1.9 + 0.4 * ((i * 7) % 3)
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = Math.sin(a * 2) * 0.35
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    return positions
  }, [])

  useFrame(({ clock }, delta) => {
    const f = frame.current
    const fade = f.visibility * (1 - f.dim * 0.6)
    const t = clock.elapsedTime
    if (glowRef.current) {
      const breath = reducedMotion ? 0.75 : 0.5 + 0.5 * Math.sin(t * 1.5 + phase)
      glowRef.current.material.opacity = (0.08 + 0.16 * breath) * fade
      glowRef.current.scale.setScalar(4.2 + 0.6 * breath)
    }
    if (sparksRef.current && groupRef.current) {
      const show = f.lod !== 'point' && fade > 0.15
      sparksRef.current.visible = show
      if (show) {
        groupRef.current.rotation.y += delta * (reducedMotion ? 0.04 : 0.28)
        const flicker = reducedMotion ? 0.8 : 0.65 + 0.35 * Math.sin(t * 3.1 + phase)
        ;(sparksRef.current.material as PointsMaterial).opacity = 0.75 * flicker * fade
      }
    }
  })

  if (kind === 'trending') return <ObjectGlow ref={glowRef} color={color} whiten={0.5} scale={4.2} opacity={0} depthTest={false} />

  return (
    <group ref={groupRef} rotation={[0.4, 0, 0.3]}>
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={tint} size={0.11} sizeAttenuation transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  )
}
