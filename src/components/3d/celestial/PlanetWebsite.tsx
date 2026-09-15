import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, Color, type Group, type Mesh, type MeshStandardMaterial, type ShaderMaterial, type Sprite } from 'three'
import type { QualityProfile } from '../../../hooks/useQualityProfile'
import type { WebsiteDefinition } from '../../../types/galaxy'
import { accentFor, createSurfaceTexture, glowFor } from '../../../utils/celestial'
import type { OrbitSpec } from '../../../utils/generateOrbits'
import { sceneMotion } from '../../../lib/sceneMotion'
import { atmosphereFragmentShader, atmosphereVertexShader } from '../shaders/pointShaders'
import type { CelestialFrameState } from './celestialFrame'
import { ObjectGlow } from './ObjectGlow'

interface PlanetWebsiteProps {
  website: WebsiteDefinition
  frame: RefObject<CelestialFrameState>
  orbit: OrbitSpec
  profile: QualityProfile
  /** Moons are smaller, duller and cheaper. */
  muted?: boolean
}

/** A regular website: textured sphere, atmospheric rim, slow rotation. */
export function PlanetWebsite({ website, frame, orbit, profile, muted = false }: PlanetWebsiteProps) {
  const tiltRef = useRef<Group>(null)
  const surfaceRef = useRef<Mesh>(null)
  const detailRef = useRef<Mesh>(null)
  const atmosphereRef = useRef<Mesh>(null)
  const haloRef = useRef<Sprite>(null)
  const glow = glowFor(website)
  const accent = accentFor(website)

  const texture = useMemo(() => createSurfaceTexture(website, muted), [website, muted])
  useEffect(() => () => texture.dispose(), [texture])

  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new Color(accent).lerp(new Color('#dfe6ff'), muted ? 0.6 : 0.3) },
      uIntensity: { value: 0 },
      uPower: { value: muted ? 3.2 : 2.4 },
    }),
    [accent, muted],
  )

  const segments = muted ? Math.max(12, Math.round(profile.planetSegments * 0.5)) : profile.planetSegments
  const detailSegments = muted ? 32 : 64
  const showAtmosphere = profile.atmosphere && !muted

  useFrame((_, delta) => {
    const f = frame.current
    const fade = f.visibility * (1 - f.dim * 0.55)
    const full = f.lod !== 'point'
    const detail = f.lod === 'detail'

    if (surfaceRef.current) {
      surfaceRef.current.visible = full && !detail
      surfaceRef.current.rotation.y += orbit.spin * delta * sceneMotion.motionScale * (1 - f.hover * 0.5)
      ;(surfaceRef.current.material as MeshStandardMaterial).opacity = fade
    }
    if (detailRef.current) {
      // Close-ups swap in the finer sphere; both share the rotation.
      detailRef.current.visible = detail
      detailRef.current.rotation.y = surfaceRef.current?.rotation.y ?? 0
      ;(detailRef.current.material as MeshStandardMaterial).opacity = fade
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.visible = full
      const material = atmosphereRef.current.material as ShaderMaterial
      material.uniforms.uIntensity.value = (muted ? 0.35 : 0.6) * glow * fade * (1 + f.hover * 0.6 + f.focus * 0.4)
    }
    if (haloRef.current) {
      // At point-LOD the halo stands in for the whole object, so it brightens.
      const base = full ? 0.09 : 0.55
      haloRef.current.material.opacity = base * glow * fade * (1 + f.hover * 0.8 + f.focus * 0.4)
    }
  })

  return (
    <group ref={tiltRef} rotation={[0, 0, orbit.tilt]}>
      <mesh ref={surfaceRef}>
        <sphereGeometry args={[1, segments, Math.round(segments * 0.7)]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} transparent />
      </mesh>
      <mesh ref={detailRef} visible={false}>
        <sphereGeometry args={[1, detailSegments, Math.round(detailSegments * 0.7)]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} transparent />
      </mesh>
      {showAtmosphere && (
        <mesh ref={atmosphereRef} scale={1.06}>
          <sphereGeometry args={[1, Math.round(segments * 0.75), Math.round(segments * 0.5)]} />
          <shaderMaterial
            vertexShader={atmosphereVertexShader}
            fragmentShader={atmosphereFragmentShader}
            uniforms={atmosphereUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
      <ObjectGlow ref={haloRef} color={accent} whiten={0.25} scale={muted ? 2.6 : 3.2} />
    </group>
  )
}
