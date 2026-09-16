import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, MathUtils, NormalBlending, Object3D, ShaderMaterial, Sphere, Texture, Vector2, Vector3 } from 'three'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import type { LogoAtlas } from '../../../lib/logoAtlas'
import { sceneMotion } from '../../../lib/sceneMotion'
import { useGalaxyStore } from '../../../store/galaxyStore'
import type { UniverseDefinition, WebsiteDefinition } from '../../../types/galaxy'
import { accentFor, fadeDistancesFor, glowFor, sizeFor } from '../../../utils/celestial'
import { orbitPosition, type OrbitSpec } from '../../../utils/generateOrbits'
import { websitePointFragmentShader, websitePointVertexShader } from '../shaders/pointShaders'

interface WebsitePointsProps {
  universe: UniverseDefinition
  websites: WebsiteDefinition[]
  orbits: Map<string, OrbitSpec>
  pixelRatio: number
  /** Interior growth of the universe for its population (see `interiorScale`). */
  interior?: number
  /** Inside the entered universe points answer the pointer: hover names them, click focuses. */
  interactive?: boolean
  /** Icon atlas of the universe, when loaded: points become medallions inside it. */
  atlas?: LogoAtlas | null
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
export function WebsitePoints({ universe, websites, orbits, pixelRatio, interior = 1, interactive = false, atlas = null }: WebsitePointsProps) {
  const groupRef = useRef<Group>(null)
  const positionRef = useRef<BufferAttribute>(null)
  const alphaRef = useRef<BufferAttribute>(null)
  const boostRef = useRef<BufferAttribute>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometryRef = useRef<BufferGeometry>(null)
  const timeRef = useRef(0)
  const frameRef = useRef(0)

  const entries = useMemo(
    () =>
      websites
        .map((website) => ({ website, orbit: orbits.get(website.id), fade: fadeDistancesFor(website, universe, interior) }))
        .filter((e): e is { website: WebsiteDefinition; orbit: OrbitSpec; fade: { near: number; far: number } } => !!e.orbit),
    [websites, orbits, universe, interior],
  )

  // Pointer handling: a hovered point is promoted to a full object by
  // `UniverseWebsites` (through the store), which then owns the interaction.
  const [hovered, setHovered] = useState(false)
  const setHoveredWebsite = useGalaxyStore((s) => s.setHoveredWebsite)
  const selectWebsite = useGalaxyStore((s) => s.selectWebsite)
  useCursor(interactive && hovered)
  const alphasRef = useRef<Float32Array | null>(null)
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const index = e.index ?? -1
    const entry = entries[index]
    // Points that have faded out (distance, filters) must not react.
    if (!entry || (alphasRef.current?.[index] ?? 0) < 0.25) return null
    return entry.website
  }
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const website = interactive ? pick(e) : null
    if (!website) return
    e.stopPropagation()
    setHovered(true)
    setHoveredWebsite(website.id)
  }
  const onPointerOut = () => setHovered(false)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const website = interactive ? pick(e) : null
    if (!website) return
    e.stopPropagation()
    selectWebsite(website.id, website.universeId)
  }

  const buffers = useMemo(() => {
    const n = entries.length
    const positions = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const uvs = new Float32Array(n * 2)
    const color = new Color()
    entries.forEach(({ website }, i) => {
      sizes[i] = SIZE_BY_TYPE[website.objectType] * (0.7 + 0.6 * glowFor(website)) * Math.max(0.5, sizeFor(website))
      color.set(accentFor(website))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      const uv = atlas?.uvOf(website.id) ?? null
      uvs[i * 2] = uv ? uv.u : -1
      uvs[i * 2 + 1] = uv ? uv.v : -1
    })
    return { positions, sizes, colors, uvs, alphas: new Float32Array(n), boosts: new Float32Array(n) }
  }, [entries, atlas])

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

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uMedallion: { value: 0 },
      uAtlas: { value: null as Texture | null },
      uCell: { value: new Vector2(0, 0) },
    }),
    [pixelRatio],
  )
  /** Inside the entered universe the points stand for real websites: bigger, brighter, and medallions when icons exist. */
  const INSIDE_SCALE = 5.2

  useFrame(({ camera }, delta) => {
    const position = positionRef.current
    const alpha = alphaRef.current
    const boost = boostRef.current
    const material = materialRef.current
    if (!position || !alpha || !boost || !material || !groupRef.current) return
    timeRef.current += delta * sceneMotion.motionScale
    material.uniforms.uTime.value += delta
    const scaleTarget = interactive ? INSIDE_SCALE * sceneMotion.universeFraming : 1
    material.uniforms.uScale.value += (scaleTarget - material.uniforms.uScale.value) * (1 - Math.exp(-delta * 3))
    if (material.uniforms.uAtlas.value !== (atlas?.texture ?? null)) {
      material.uniforms.uAtlas.value = atlas?.texture ?? null
      material.uniforms.uCell.value.set(atlas ? 1 / atlas.columns : 0, atlas ? 1 / atlas.rows : 0)
    }
    const medallionTarget = interactive && atlas ? 1 : 0
    const medallion = (material.uniforms.uMedallion.value += (medallionTarget - material.uniforms.uMedallion.value) * (1 - Math.exp(-delta * 3)))
    // Dots add light; medallions have a dark disc and must be composited normally.
    const blending = medallion > 0.5 ? NormalBlending : AdditiveBlending
    if (material.blending !== blending) {
      material.blending = blending
      material.needsUpdate = true
    }
    // Seen from afar the points are specks whose motion is invisible: a
    // distant universe refreshes its cloud every fourth frame, staggered so
    // the work spreads evenly. The entered universe updates every frame.
    const stride = interactive ? 1 : 4
    if (frameRef.current++ % stride !== universe.seed % stride) return
    const { emphasis, filter, relations } = sceneMotion
    const entry = sceneMotion.universeEntry[universe.id] ?? 1
    const pos = position.array as Float32Array
    const alphas = alpha.array as Float32Array
    const boosts = boost.array as Float32Array
    alphasRef.current = alphas
    const t = timeRef.current
    // From outside, one distance for the whole universe is accurate enough.
    const universeDistance = interactive ? 0 : groupRef.current.getWorldPosition(worldPosition).distanceTo(camera.position)

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

      const distance = interactive ? placeholder.getWorldPosition(worldPosition).distanceTo(camera.position) : universeDistance
      let visibility = (1 - MathUtils.smoothstep(distance, fade.near, fade.far)) * entry * sceneMotion.universeReveal
      const emphasized = emphasis.active && emphasis.websiteIds.has(website.id)
      const connected = relations.active && relations.websiteIds.has(website.id)
      if (emphasized || connected) visibility = Math.max(visibility, 0.9)
      else if (emphasis.active) visibility *= 1 - emphasis.dimOthers
      if (filter.active && !filter.websiteIds.has(website.id)) visibility *= 0.15
      alphas[i] = visibility * (0.55 + 0.45 * glowFor(website)) * (interactive ? 1.25 : 1)
      boosts[i] = emphasized ? 1 : connected ? 0.6 : 0
    })
    position.needsUpdate = true
    alpha.needsUpdate = true
    boost.needsUpdate = true
    // Raycasting rejects against the bounding sphere first; keep it honest as
    // the points move (it would otherwise stay at the zeroed initial buffer).
    const geometry = geometryRef.current
    if (interactive && geometry) {
      if (!geometry.boundingSphere) geometry.boundingSphere = new Sphere()
      geometry.computeBoundingSphere()
    }
  })

  if (!entries.length) return <group ref={groupRef} />

  return (
    <group ref={groupRef}>
      {/* Handlers are always attached (the event system registers them on mount); they act only inside the entered universe. */}
      <points frustumCulled={false} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute ref={positionRef} attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aUv" args={[buffers.uvs, 2]} />
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
