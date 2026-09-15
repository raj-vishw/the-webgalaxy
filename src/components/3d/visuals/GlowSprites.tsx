import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, Color, Group, Mesh, Quaternion, ShaderMaterial } from 'three'
import type { GlowSpec } from '../../../lib/universeGeometry'
import { glowFragmentShader, glowVertexShader } from '../shaders/pointShaders'
import type { UniverseFrameState } from './universeFrame'

interface GlowSpritesProps {
  glows: GlowSpec[]
  frame: RefObject<UniverseFrameState>
}

const parentQuaternion = new Quaternion()

/**
 * Soft radial glows (galaxy cores, nebula lobes, bright stars). Each plane is
 * billboarded manually so it faces the camera even inside rotated parents.
 */
export function GlowSprites({ glows, frame }: GlowSpritesProps) {
  const groupRef = useRef<Group>(null)
  const meshRefs = useRef<(Mesh | null)[]>([])

  const uniformSets = useMemo(
    () =>
      glows.map((glow) => ({
        uColor: { value: new Color(glow.color) },
        uIntensity: { value: glow.intensity },
        uFalloff: { value: glow.falloff },
        uReveal: { value: 0 },
        uHover: { value: 0 },
        uDim: { value: 0 },
      })),
    [glows],
  )

  useFrame(({ camera }) => {
    const group = groupRef.current
    if (!group) return
    group.getWorldQuaternion(parentQuaternion).invert()
    meshRefs.current.forEach((mesh) => {
      if (!mesh) return
      mesh.quaternion.copy(parentQuaternion).multiply(camera.quaternion)
      const material = mesh.material as ShaderMaterial
      material.uniforms.uReveal.value = frame.current.reveal
      material.uniforms.uHover.value = frame.current.hover
      material.uniforms.uDim.value = frame.current.dim
    })
  })

  return (
    <group ref={groupRef}>
      {glows.map((glow, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el
          }}
          position={glow.position as [number, number, number]}
          scale={glow.size}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={glowVertexShader}
            fragmentShader={glowFragmentShader}
            uniforms={uniformSets[i]}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
