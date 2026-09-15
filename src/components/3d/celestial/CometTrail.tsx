import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, BufferAttribute, Color, ShaderMaterial, Vector3 } from 'three'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { accentFor } from '../../../utils/celestial'
import { orbitPosition, type CometOrbit } from '../../../utils/generateOrbits'
import { cometTrailFragmentShader, cometTrailVertexShader } from '../shaders/pointShaders'
import type { CelestialFrameState } from './celestialFrame'

interface CometTrailProps {
  website: WebsiteDefinition
  orbit: CometOrbit
  frame: RefObject<CelestialFrameState>
  pixelRatio: number
  /** Fraction of the orbit period the tail spans. */
  span?: number
  samples?: number
}

const point = new Vector3()

/**
 * Tail sampled analytically along the orbit behind the head, so its length is
 * stable regardless of frame rate. Lives in universe-local space.
 */
export function CometTrail({ website, orbit, frame, pixelRatio, span = 0.085, samples = 56 }: CometTrailProps) {
  const positionRef = useRef<BufferAttribute>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  const buffers = useMemo(() => {
    const positions = new Float32Array(samples * 3)
    const ages = new Float32Array(samples)
    for (let i = 0; i < samples; i++) ages[i] = i / (samples - 1)
    return { positions, ages }
  }, [samples])

  const accent = accentFor(website)
  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0 },
      uSize: { value: 2.2 },
      uColor: { value: new Color(accent).lerp(new Color('#ffffff'), 0.3) },
    }),
    [pixelRatio, accent],
  )

  useFrame(() => {
    const attribute = positionRef.current
    const material = materialRef.current
    if (!attribute || !material) return
    const f = frame.current
    const step = (orbit.period * span) / samples
    const array = attribute.array as Float32Array
    for (let i = 0; i < samples; i++) {
      orbitPosition(orbit, f.time - i * step, point)
      array[i * 3] = point.x
      array[i * 3 + 1] = point.y
      array[i * 3 + 2] = point.z
    }
    attribute.needsUpdate = true
    material.uniforms.uOpacity.value = 0.42 * f.visibility * (1 - f.dim * 0.55) * (1 + f.hover * 0.3)
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-aAge" args={[buffers.ages, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={cometTrailVertexShader}
        fragmentShader={cometTrailFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
