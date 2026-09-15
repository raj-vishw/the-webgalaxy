import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, Group, MathUtils, ShaderMaterial, Vector3 } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import { createRandom } from '../../../lib/random'
import { sceneMotion } from '../../../lib/sceneMotion'
import type { UniverseDefinition } from '../../../types/galaxy'
import { starFragmentShader, starVertexShader } from '../shaders/pointShaders'

interface UniverseEnvironmentProps {
  universe: UniverseDefinition
  profile: QualityProfile
  pixelRatio: number
}

const BASE_DUST = 520
const worldPosition = new Vector3()

function buildDust(universe: UniverseDefinition, count: number) {
  const rnd = createRandom(universe.seed * 131 + 5)
  const { layout, scale } = universe
  const radii = [layout.spread[0] * scale * 1.2, layout.spread[1] * scale * 1.3, layout.spread[2] * scale * 1.2]
  const primary = new Color(universe.palette.primary)
  const secondary = new Color(universe.palette.secondary)
  const tint = new Color()

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightness = new Float32Array(count)
  const seeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const [dx, dy, dz] = rnd.onSphere()
    const r = Math.pow(rnd.next(), 0.45)
    positions[i * 3] = dx * radii[0] * r
    positions[i * 3 + 1] = dy * radii[1] * r
    positions[i * 3 + 2] = dz * radii[2] * r
    tint.copy(primary).lerp(secondary, rnd.next())
    colors[i * 3] = tint.r
    colors[i * 3 + 1] = tint.g
    colors[i * 3 + 2] = tint.b
    sizes[i] = rnd.range(0.12, 0.4)
    brightness[i] = rnd.range(0.08, 0.28)
    seeds[i] = rnd.next()
  }
  return { positions, colors, sizes, brightness, seeds }
}

/**
 * Atmospheric interior of a universe: fine drifting dust tinted by the
 * universe's palette, plus a couple of dim background bodies for depth. Only
 * visible once the camera is near, so the galaxy overview stays clean.
 */
export function UniverseEnvironment({ universe, profile, pixelRatio }: UniverseEnvironmentProps) {
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const count = Math.round(BASE_DUST * universe.layout.dust * profile.dustDetail)
  const dust = useMemo(() => buildDust(universe, count), [universe, count])

  const backgroundBodies = useMemo(() => {
    const rnd = createRandom(universe.seed * 17 + 3)
    const { layout, scale } = universe
    return Array.from({ length: 2 }, () => {
      const [dx, dy, dz] = rnd.onSphere()
      return {
        position: [dx * layout.spread[0] * scale * 1.35, dy * layout.spread[1] * scale * 1.4, dz * layout.spread[2] * scale * 1.35] as [number, number, number],
        radius: rnd.range(0.35, 0.7),
      }
    })
  }, [universe])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uReveal: { value: 0 },
      uAttenuation: { value: 1 },
      uDrift: { value: 0.35 * universe.layout.energy },
    }),
    [pixelRatio, universe.layout.energy],
  )

  useFrame(({ camera, clock }) => {
    const group = groupRef.current
    const material = materialRef.current
    if (!group || !material) return
    const distance = group.getWorldPosition(worldPosition).distanceTo(camera.position)
    const visibility = 1 - MathUtils.smoothstep(distance, universe.scale * 4.5, universe.scale * 7.5)
    group.visible = visibility > 0.01
    material.uniforms.uTime.value = clock.elapsedTime * sceneMotion.motionScale
    material.uniforms.uReveal.value = visibility
  })

  return (
    <group ref={groupRef} position={universe.position as [number, number, number]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[dust.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[dust.sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[dust.brightness, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[dust.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      {profile.tier !== 'low' &&
        backgroundBodies.map((body, i) => (
          <mesh key={i} position={body.position} scale={body.radius}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#2a2f45" roughness={1} />
          </mesh>
        ))}
    </group>
  )
}
