import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import { sceneMotion } from '../../lib/sceneMotion'
import { nebulaFragmentShader, nebulaVertexShader } from './shaders/pointShaders'

interface BackgroundNebulaProps {
  /** Peak haze brightness; keep very low so the scene stays near-black. */
  intensity?: number
}

/** A barely-there cosmic haze on the inside of the sky sphere. */
export function BackgroundNebula({ intensity = 0.028 }: BackgroundNebulaProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new Color('#2b3d8c') },
      uColorB: { value: new Color('#4a2c78') },
      uIntensity: { value: 0 },
    }),
    [],
  )

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.elapsedTime
    // The haze fades in with the stars so the opening frame is truly dark.
    material.uniforms.uIntensity.value = intensity * sceneMotion.starReveal
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1800, 32, 24]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
