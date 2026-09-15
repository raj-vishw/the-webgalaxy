import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, Color, Group, MathUtils, Object3D, ShaderMaterial, Vector3 } from 'three'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { sceneMotion } from '../../../lib/sceneMotion'
import type { UniverseDefinition, WebsiteDefinition } from '../../../types/galaxy'
import { accentFor, fadeDistancesFor, glowFor, sizeFor } from '../../../utils/celestial'
import { orbitPosition, type OrbitSpec } from '../../../utils/generateOrbits'
import { websitePointFragmentShader, websitePointVertexShader } from '../shaders/pointShaders'

interface WebsitePointsProps {
  universe: UniverseDefinition
  websites: WebsiteDefinition[]
  orbits: Map<string, OrbitSpec>
  pixelRatio: number
}

const SIZE_BY_TYPE = { star: 1.9, planet: 1.25, moon: 0.85, comet: 1.0 } as const

const worldPosition = new Vector3()
const anchorPosition = new Vector3()

/**
 * One draw call for all the websites of a universe that are not currently
 * worth a full celestial object (far away, or beyond the per-universe detail
 * budget). They still orbit, still fade with distance, still light up for
 * search and connections, and each registers a placeholder so flights and
 * connection lines can target them. The moment one is selected, hovered or
 * connected, `UniverseWebsites` promotes it to a full object.
 */
export function WebsitePoints({ universe, websites, orbits, pixelRatio }: WebsitePointsProps) {
  const groupRef = useRef<Group>(null)
  const positionRef = useRef<BufferAttribute>(null)
  const alphaRef = useRef<BufferAttribute>(null)
  const boostRef = useRef<BufferAttribute>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const timeRef = useRef(0)

  const entries = useMemo(
    () =>
      websites
        .map((website) => ({ website, orbit: orbits.get(website.id), fade: fadeDistancesFor(website, universe) }))
        .filter((e): e is { website: WebsiteDefinition; orbit: OrbitSpec; fade: { near: number; far: number } } => !!e.orbit),
    [websites, orbits, universe],
  )

  const buffers = useMemo(() => {
    const n = entries.length
    const positions = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const color = new Color()
    entries.forEach(({ website }, i) => {
      sizes[i] = SIZE_BY_TYPE[website.objectType] * (0.7 + 0.6 * glowFor(website)) * Math.max(0.5, sizeFor(website))
      color.set(accentFor(website))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })
    return { positions, sizes, colors, alphas: new Float32Array(n), boosts: new Float32Array(n) }
  }, [entries])

  // Placeholders: real objects in the scene graph (no geometry) so world
  // positions resolve for camera targeting and connection lines.
  const placeholders = useMemo(() => entries.map(() => new Object3D()), [entries])
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    placeholders.forEach((p) => group.add(p))
    const unregister = entries.map(({ website }, i) => celestialRegistry.registerPlaceholder(website.id, placeholders[i]))
    return () => {
      unregister.forEach((fn) => fn())
      placeholders.forEach((p) => group.remove(p))
    }
  }, [entries, placeholders])

  const uniforms = useMemo(() => ({ uPixelRatio: { value: pixelRatio }, uTime: { value: 0 } }), [pixelRatio])

  useFrame(({ camera }, delta) => {
    const position = positionRef.current
    const alpha = alphaRef.current
    const boost = boostRef.current
    const material = materialRef.current
    if (!position || !alpha || !boost || !material || !groupRef.current) return
    timeRef.current += delta * sceneMotion.motionScale
    material.uniforms.uTime.value += delta
    const { emphasis, filter, relations } = sceneMotion
    const entry = sceneMotion.universeEntry[universe.id] ?? 1
    const pos = position.array as Float32Array
    const alphas = alpha.array as Float32Array
    const boosts = boost.array as Float32Array
    const t = timeRef.current

    entries.forEach(({ website, orbit, fade }, i) => {
      const placeholder = placeholders[i]
      if (orbit.kind === 'moon') {
        const anchor = celestialRegistry.get(orbit.anchorId)
        // The anchor may be a full object (universe-local space) or a sibling placeholder.
        if (anchor) anchorPosition.copy(anchor.position)
        orbitPosition(orbit, t, placeholder.position, anchorPosition)
      } else {
        orbitPosition(orbit, t, placeholder.position)
      }
      pos[i * 3] = placeholder.position.x
      pos[i * 3 + 1] = placeholder.position.y
      pos[i * 3 + 2] = placeholder.position.z

      const distance = placeholder.getWorldPosition(worldPosition).distanceTo(camera.position)
      let visibility = (1 - MathUtils.smoothstep(distance, fade.near, fade.far)) * entry * sceneMotion.universeReveal
      const emphasized = emphasis.active && emphasis.websiteIds.has(website.id)
      const connected = relations.active && relations.websiteIds.has(website.id)
      if (emphasized || connected) visibility = Math.max(visibility, 0.9)
      else if (emphasis.active) visibility *= 1 - emphasis.dimOthers
      if (filter.active && !filter.websiteIds.has(website.id)) visibility *= 0.15
      alphas[i] = visibility * (0.55 + 0.45 * glowFor(website))
      boosts[i] = emphasized ? 1 : connected ? 0.6 : 0
    })
    position.needsUpdate = true
    alpha.needsUpdate = true
    boost.needsUpdate = true
  })

  if (!entries.length) return <group ref={groupRef} />

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute ref={positionRef} attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
          <bufferAttribute ref={alphaRef} attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
          <bufferAttribute ref={boostRef} attach="attributes-aBoost" args={[buffers.boosts, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={websitePointVertexShader}
          fragmentShader={websitePointFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
