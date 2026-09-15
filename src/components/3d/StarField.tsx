import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import { useParallax } from '../../hooks/useParallax'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { createRandom } from '../../lib/random'
import { sceneMotion } from '../../lib/sceneMotion'
import { starFragmentShader, starVertexShader } from './shaders/pointShaders'

interface StarLayerConfig {
  key: keyof QualityProfile['stars']
  seed: number
  radius: [number, number]
  size: [number, number]
  /** 0 = constant pixel size (distant), 1 = fully perspective-scaled (near). */
  attenuation: number
  drift: number
  parallax: number
  /** Fraction of stars squashed into a faint tilted band. */
  band: number
}

const LAYERS: StarLayerConfig[] = [
  { key: 'far', seed: 1, radius: [950, 1500], size: [0.9, 1.7], attenuation: 0, drift: 0, parallax: 5, band: 0.4 },
  { key: 'mid', seed: 2, radius: [420, 820], size: [0.8, 1.9], attenuation: 0.4, drift: 0.5, parallax: 3.2, band: 0.15 },
  { key: 'near', seed: 3, radius: [140, 400], size: [1.0, 3.0], attenuation: 1, drift: 1.4, parallax: 2, band: 0 },
]

const BAND_TILT_X = 0.45
const BAND_TILT_Z = 0.3

const TINTS = [
  new Color('#ffffff'),
  new Color('#dbe4ff'),
  new Color('#c3d2ff'),
  new Color('#ffe9d6'),
  new Color('#a9bdff'),
]

function buildLayer(config: StarLayerConfig, count: number) {
  const rnd = createRandom(config.seed * 7919)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightness = new Float32Array(count)
  const seeds = new Float32Array(count)

  const cosX = Math.cos(BAND_TILT_X), sinX = Math.sin(BAND_TILT_X)
  const cosZ = Math.cos(BAND_TILT_Z), sinZ = Math.sin(BAND_TILT_Z)

  for (let i = 0; i < count; i++) {
    let [x, y, z] = rnd.onSphere()
    if (rnd.next() < config.band) {
      // Flatten towards a plane, then tilt that plane so it isn't axis-aligned.
      y *= 0.18
      const y1 = y * cosX - z * sinX
      const z1 = y * sinX + z * cosX
      const x2 = x * cosZ - y1 * sinZ
      const y2 = x * sinZ + y1 * cosZ
      x = x2; y = y2; z = z1
      const len = Math.hypot(x, y, z) || 1
      x /= len; y /= len; z /= len
    }
    const r = rnd.range(config.radius[0], config.radius[1])
    positions[i * 3] = x * r
    positions[i * 3 + 1] = y * r
    positions[i * 3 + 2] = z * r

    // Weighted so most stars are faint and cool-white; a few are bright.
    const isBright = rnd.next() < 0.04
    const tint = TINTS[rnd.next() < 0.7 ? Math.floor(rnd.next() * 3) : 3 + Math.floor(rnd.next() * 2)]
    colors[i * 3] = tint.r
    colors[i * 3 + 1] = tint.g
    colors[i * 3 + 2] = tint.b
    sizes[i] = isBright ? config.size[1] * rnd.range(1.1, 1.5) : rnd.range(config.size[0], config.size[1])
    brightness[i] = isBright ? rnd.range(0.75, 1) : 0.15 + 0.7 * Math.pow(rnd.next(), 2.2)
    seeds[i] = rnd.next()
  }
  return { positions, colors, sizes, brightness, seeds }
}

interface StarLayerProps {
  config: StarLayerConfig
  count: number
  pixelRatio: number
}

function StarLayer({ config, count, pixelRatio }: StarLayerProps) {
  const groupRef = useParallax(config.parallax)
  const materialRef = useRef<ShaderMaterial>(null)
  const data = useMemo(() => buildLayer(config, count), [config, count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uReveal: { value: 0 },
      uAttenuation: { value: config.attenuation },
      uDrift: { value: config.drift },
    }),
    [config, pixelRatio],
  )

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uReveal.value = sceneMotion.starReveal
  })

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[data.brightness, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
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
    </group>
  )
}

interface StarFieldProps {
  profile: QualityProfile
  pixelRatio: number
}

/** Three concentric shells of stars, each with its own parallax response. */
export function StarField({ profile, pixelRatio }: StarFieldProps) {
  return (
    <>
      {LAYERS.map((layer) => (
        <StarLayer key={layer.key} config={layer} count={profile.stars[layer.key]} pixelRatio={pixelRatio} />
      ))}
    </>
  )
}
