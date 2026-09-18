import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, ShaderMaterial, type Sprite } from 'three'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { createRandom } from '../../lib/random'
import { sceneMotion } from '../../lib/sceneMotion'
import { useGalaxyStore } from '../../store/galaxyStore'
import { ARM_COUNT, ARM_INNER, ARM_OUTER, DISC_DEPTH, armAngle, armRadius } from '../../utils/galaxyShape'
import { ROTATION } from '../../utils/universeDrift'
import { ObjectGlow } from './celestial/ObjectGlow'

interface GalacticDiscProps {
  profile: QualityProfile
  pixelRatio: number
}

const ARM_PARTICLES = 14000
const BULGE_PARTICLES = 2600

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uDepth;
  uniform float uInner;
  uniform float uOuter;
  uniform float uPeriod;
  uniform float uShear;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // Positions are stored on the un-squashed circle; rotate there, then squash z.
    float r = length(position.xz);
    float shear = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float omega = 6.28318 / uPeriod * (1.0 - uShear * shear);
    float a = omega * uTime;
    float c = cos(a), s = sin(a);
    vec3 p = vec3(c * position.x - s * position.z, position.y, (s * position.x + c * position.z) * uDepth);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Gentler than true perspective so the disc stays visible from far portrait views.
    gl_PointSize = clamp(aSize * uPixelRatio * pow(520.0 / max(-mv.z, 1.0), 0.7), 1.0, 4.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = aAlpha;
  }
`
const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = exp(-d * d * 3.0) * vAlpha * uOpacity;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }
`

/**
 * The galaxy's own body: a faint disc of dust along the spiral arms and a
 * soft bulge at the centre, turning with the same differential rotation as
 * the universes. It is what makes the overview read as a galaxy rather than
 * a scatter of points; it carries no information and fades away once a
 * universe is entered.
 */
export function GalacticDisc({ profile, pixelRatio }: GalacticDiscProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const coreRef = useRef<Sprite>(null)
  const presenceRef = useRef(0)

  const buffers = useMemo(() => {
    const detail = Math.max(0.35, profile.universeDetail)
    const arms = Math.round(ARM_PARTICLES * detail)
    const bulge = Math.round(BULGE_PARTICLES * detail)
    const n = arms + bulge
    const positions = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const alphas = new Float32Array(n)
    const rnd = createRandom(90210)
    const cool = new Color('#9db4ff')
    const warm = new Color('#ffd9b0')
    const white = new Color('#e8eeff')
    const color = new Color()
    let i = 0
    const put = (x: number, y: number, z: number, size: number, c: Color, alpha: number) => {
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      sizes[i] = size
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
      alphas[i] = alpha
      i++
    }
    for (let k = 0; k < arms; k++) {
      const arm = k % ARM_COUNT
      // Denser toward the inner end, thinning outward.
      const t = Math.pow(rnd.next(), 0.8)
      const spread = 9 + 9 * t
      const r = armRadius(t) + rnd.gaussian() * spread
      const angle = armAngle(arm, t) + (rnd.gaussian() * 0.06) / Math.max(0.35, t + 0.2)
      const y = rnd.gaussian() * (3.5 + 2.5 * (1 - t))
      color.copy(cool).lerp(white, rnd.next() * 0.6).lerp(warm, Math.max(0, 0.5 - t) * rnd.next())
      put(Math.cos(angle) * r, y, Math.sin(angle) * r, rnd.range(0.9, 2.6), color, rnd.range(0.16, 0.5) * (1 - 0.3 * t))
    }
    for (let k = 0; k < bulge; k++) {
      const r = Math.abs(rnd.gaussian()) * 22
      const angle = rnd.next() * Math.PI * 2
      const y = rnd.gaussian() * 7
      color.copy(warm).lerp(white, rnd.next() * 0.7)
      put(Math.cos(angle) * r, y, Math.sin(angle) * r, rnd.range(0.9, 2.4), color, rnd.range(0.14, 0.45))
    }
    return { positions, sizes, colors, alphas }
  }, [profile.universeDetail])

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uDepth: { value: DISC_DEPTH },
      uInner: { value: ARM_INNER },
      uOuter: { value: ARM_OUTER },
      uPeriod: { value: ROTATION.innerPeriod },
      uShear: { value: ROTATION.shear },
      uOpacity: { value: 0 },
    }),
    [pixelRatio],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    const inOverview = useGalaxyStore.getState().viewMode === 'galaxy'
    presenceRef.current += ((inOverview ? 1 : 0.25) - presenceRef.current) * (1 - Math.exp(-delta * 1.5))
    material.uniforms.uTime.value = sceneMotion.driftTime
    material.uniforms.uOpacity.value = presenceRef.current * sceneMotion.universeReveal
    if (coreRef.current) coreRef.current.material.opacity = 0.11 * presenceRef.current * sceneMotion.universeReveal
  })

  return (
    <group>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
      <ObjectGlow ref={coreRef} color="#ffd9b0" whiten={0.15} scale={64} opacity={0} depthTest={false} />
    </group>
  )
}
