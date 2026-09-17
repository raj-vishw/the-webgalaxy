import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, Color, ShaderMaterial, Vector3 } from 'three'
import { universeAffinities } from '../../data/recommendations'
import { createRandom } from '../../lib/random'
import { sceneMotion } from '../../lib/sceneMotion'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { UniverseDefinition } from '../../types/galaxy'
import { driftedPosition } from '../../utils/universeDrift'
import { cometTrailFragmentShader, cometTrailVertexShader } from './shaders/pointShaders'

interface GalaxyLifeProps {
  pixelRatio: number
  reducedMotion: boolean
}

/** Comets crossing the whole galaxy on long, tilted ellipses. */
const COMET_COUNT = 4
const COMET_SAMPLES = 64
/** Dust points per affinity filament. */
const FILAMENT_SAMPLES = 36

const point = new Vector3()
const a = new Vector3()
const b = new Vector3()
const mid = new Vector3()

interface GalaxyComet {
  a: number
  e: number
  period: number
  phase: number
  e1: Vector3
  e2: Vector3
  color: string
}

function cometAt(c: GalaxyComet, t: number, out: Vector3): Vector3 {
  const angle = c.phase + (Math.PI * 2 * t) / c.period
  const bAxis = c.a * Math.sqrt(1 - c.e * c.e)
  return out
    .set(0, 0, 0)
    .addScaledVector(c.e1, c.a * (Math.cos(angle) - c.e))
    .addScaledVector(c.e2, bAxis * Math.sin(angle))
}

/**
 * The space between universes: a few comets on galaxy-wide orbits and faint
 * filaments of dust between universes that share an affinity, pulsing
 * slowly. Filaments follow the live (rotating, drifting) positions, so they
 * are a hint about where to look next — never a hierarchy. Everything here
 * fades out once a universe is entered, where the websites take the stage.
 */
export function GalaxyLife({ pixelRatio, reducedMotion }: GalaxyLifeProps) {
  const universes = useCatalogStore((s) => s.universes)
  const byId = useMemo(() => new Map(universes.map((u) => [u.id, u])), [universes])
  const pairs = useMemo(
    () =>
      universeAffinities
        .map((f) => [byId.get(f.universeIds[0]), byId.get(f.universeIds[1])] as const)
        .filter((p): p is readonly [UniverseDefinition, UniverseDefinition] => !!p[0] && !!p[1]),
    [byId],
  )

  const comets = useMemo<GalaxyComet[]>(() => {
    const rnd = createRandom(4242)
    const palette = ['#dbe6ff', '#ffe9c8', '#d6fff4', '#f3d6ff']
    return Array.from({ length: COMET_COUNT }, (_, i) => {
      // A tilted orbital plane, mostly in the disc.
      const tilt = rnd.range(-0.35, 0.35)
      const spin = rnd.next() * Math.PI * 2
      const e1 = new Vector3(Math.cos(spin), Math.sin(tilt) * 0.6, Math.sin(spin)).normalize()
      const e2 = new Vector3(-Math.sin(spin), Math.cos(tilt) * 0.3, Math.cos(spin)).normalize()
      return { a: rnd.range(120, 210), e: rnd.range(0.55, 0.78), period: rnd.range(90, 160), phase: rnd.next() * Math.PI * 2, e1, e2, color: palette[i % palette.length] }
    })
  }, [])

  const cometBuffers = useMemo(
    () =>
      comets.map(() => {
        const ages = new Float32Array(COMET_SAMPLES)
        for (let i = 0; i < COMET_SAMPLES; i++) ages[i] = i / (COMET_SAMPLES - 1)
        return { positions: new Float32Array(COMET_SAMPLES * 3), ages }
      }),
    [comets],
  )
  const cometPositionRefs = useRef<(BufferAttribute | null)[]>([])
  const cometMaterialRefs = useRef<(ShaderMaterial | null)[]>([])

  const filament = useMemo(() => {
    const n = pairs.length * FILAMENT_SAMPLES
    const ages = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // Mirrored so both ends fade: 1 at the ends, 0 in the middle (the shader fades with age).
      const t = (i % FILAMENT_SAMPLES) / (FILAMENT_SAMPLES - 1)
      ages[i] = Math.abs(t - 0.5) * 2 * 0.85
    }
    return { positions: new Float32Array(n * 3), ages, count: n }
  }, [pairs])
  const filamentPositionRef = useRef<BufferAttribute>(null)
  const filamentMaterialRef = useRef<ShaderMaterial>(null)
  const filamentUniforms = useMemo(
    () => ({ uPixelRatio: { value: pixelRatio }, uOpacity: { value: 0 }, uSize: { value: 1.6 }, uColor: { value: new Color('#9fb0e6') } }),
    [pixelRatio],
  )
  const cometUniforms = useMemo(
    () => comets.map((c) => ({ uPixelRatio: { value: pixelRatio }, uOpacity: { value: 0 }, uSize: { value: 5.5 }, uColor: { value: new Color(c.color) } })),
    [comets, pixelRatio],
  )
  const timeRef = useRef(0)
  const presenceRef = useRef(0)

  useFrame((_, delta) => {
    const inOverview = useGalaxyStore.getState().viewMode === 'galaxy'
    const k = 1 - Math.exp(-delta * 2)
    presenceRef.current += ((inOverview ? 1 : 0) - presenceRef.current) * k
    const presence = presenceRef.current * sceneMotion.universeReveal
    if (inOverview) timeRef.current += delta * sceneMotion.motionScale * (reducedMotion ? 0.5 : 1)
    const t = timeRef.current

    // Comets: sample the tail analytically behind the head.
    comets.forEach((c, ci) => {
      const attr = cometPositionRefs.current[ci]
      const material = cometMaterialRefs.current[ci]
      if (!attr || !material) return
      const arr = attr.array as Float32Array
      const span = c.period * 0.06
      for (let i = 0; i < COMET_SAMPLES; i++) {
        cometAt(c, t - (i / (COMET_SAMPLES - 1)) * span, point)
        arr[i * 3] = point.x
        arr[i * 3 + 1] = point.y
        arr[i * 3 + 2] = point.z
      }
      attr.needsUpdate = true
      material.uniforms.uOpacity.value = 0.75 * presence
    })

    // Filaments: a gentle arc between the live positions, pulsing.
    const attr = filamentPositionRef.current
    const material = filamentMaterialRef.current
    if (attr && material) {
      const arr = attr.array as Float32Array
      pairs.forEach(([u1, u2], pi) => {
        driftedPosition(u1, sceneMotion.driftTime, a)
        driftedPosition(u2, sceneMotion.driftTime, b)
        mid.addVectors(a, b).multiplyScalar(0.5)
        mid.y += a.distanceTo(b) * 0.08
        for (let i = 0; i < FILAMENT_SAMPLES; i++) {
          const s = i / (FILAMENT_SAMPLES - 1)
          // Quadratic Bézier through the lifted midpoint, with a slow ripple along it.
          const w0 = (1 - s) * (1 - s), w1 = 2 * (1 - s) * s, w2 = s * s
          const o = (pi * FILAMENT_SAMPLES + i) * 3
          const ripple = Math.sin(t * 0.8 + s * 6 + pi) * 1.2
          arr[o] = w0 * a.x + w1 * mid.x + w2 * b.x
          arr[o + 1] = w0 * a.y + w1 * mid.y + w2 * b.y + ripple
          arr[o + 2] = w0 * a.z + w1 * mid.z + w2 * b.z
        }
      })
      attr.needsUpdate = true
      material.uniforms.uOpacity.value = (0.16 + 0.06 * Math.sin(t * 0.5)) * presence
    }
  })

  return (
    <group>
      {comets.map((_, i) => (
        <points key={i} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute
              ref={(el) => {
                cometPositionRefs.current[i] = el
              }}
              attach="attributes-position"
              args={[cometBuffers[i].positions, 3]}
            />
            <bufferAttribute attach="attributes-aAge" args={[cometBuffers[i].ages, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={(el) => {
              cometMaterialRefs.current[i] = el
            }}
            vertexShader={cometTrailVertexShader}
            fragmentShader={cometTrailFragmentShader}
            uniforms={cometUniforms[i]}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
      ))}
      {filament.count > 0 && (
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute ref={filamentPositionRef} attach="attributes-position" args={[filament.positions, 3]} />
            <bufferAttribute attach="attributes-aAge" args={[filament.ages, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={filamentMaterialRef}
            vertexShader={cometTrailVertexShader}
            fragmentShader={cometTrailFragmentShader}
            uniforms={filamentUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
      )}
    </group>
  )
}
