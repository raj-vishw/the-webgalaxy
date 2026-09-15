import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'
import type { UniverseGeometry } from '../../../lib/universeGeometry'
import { universeFragmentShader, universeVertexShader } from '../shaders/pointShaders'
import type { UniverseFrameState } from './universeFrame'

interface UniverseParticlesProps {
  geometry: UniverseGeometry
  frame: RefObject<UniverseFrameState>
  pixelRatio: number
}

/** The point cloud that gives a universe its shape. */
export function UniverseParticles({ geometry, frame, pixelRatio }: UniverseParticlesProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uDim: { value: 0 },
    }),
    [pixelRatio],
  )

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uReveal.value = frame.current.reveal
    material.uniforms.uHover.value = frame.current.hover
    material.uniforms.uDim.value = frame.current.dim
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[geometry.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[geometry.alphas, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={universeVertexShader}
        fragmentShader={universeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
