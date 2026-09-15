import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, Color, ShaderMaterial, Vector3 } from 'three'
import { celestialRegistry } from '../../../lib/celestialRegistry'
import { sceneMotion } from '../../../lib/sceneMotion'
import { hashString } from '../../../utils/celestial'
import { connectionFragmentShader, connectionVertexShader } from '../shaders/pointShaders'
import { CONNECTION_PATTERN, type ConnectionStyle } from './connectionStyles'

interface ConnectionLineProps {
  fromId: string
  toId: string
  style: ConnectionStyle
  directed: boolean
  color: string
  /** Target brightness (0–1). */
  strength: number
  /** When true the line eases out and the owner unmounts it afterwards. */
  leaving: boolean
  pixelRatio: number
  reducedMotion: boolean
}

const SAMPLES = 160
const from = new Vector3()
const to = new Vector3()
const mid = new Vector3()
const dir = new Vector3()
const side = new Vector3()
const control = new Vector3()
const a = new Vector3()
const b = new Vector3()
const point = new Vector3()
const UP = new Vector3(0, 1, 0)

/**
 * One animated connection between two websites, sampled every frame from
 * their live positions (they orbit) as a gentle arc. Purely a line between
 * equals: no arrowheads unless the relationship is genuinely directed, and
 * even then only the motion tells.
 */
export function ConnectionLine({ fromId, toId, style, directed, color, strength, leaving, pixelRatio, reducedMotion }: ConnectionLineProps) {
  const positionRef = useRef<BufferAttribute>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const fadeRef = useRef(0)
  const seed = useMemo(() => ((hashString(`${fromId}|${toId}`) % 1000) / 1000) * 2 - 1, [fromId, toId])

  const buffers = useMemo(() => {
    const positions = new Float32Array(SAMPLES * 3)
    const ts = new Float32Array(SAMPLES)
    for (let i = 0; i < SAMPLES; i++) ts[i] = i / (SAMPLES - 1)
    return { positions, ts }
  }, [])

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0 },
      uSize: { value: style === 'trail' ? 1.1 : 1.45 },
      uTime: { value: 0 },
      uPattern: { value: CONNECTION_PATTERN[style] },
      uDirected: { value: directed ? 1 : 0 },
      uColor: { value: new Color(color) },
    }),
    [pixelRatio, style, directed, color],
  )

  useFrame((_, delta) => {
    const attribute = positionRef.current
    const material = materialRef.current
    if (!attribute || !material) return
    const source = celestialRegistry.get(fromId)
    const target = celestialRegistry.get(toId)
    const k = 1 - Math.exp(-delta * (leaving ? 7 : 3.5))
    fadeRef.current += ((leaving || !source || !target ? 0 : 1) - fadeRef.current) * k
    material.uniforms.uOpacity.value = strength * fadeRef.current
    material.uniforms.uTime.value += delta * sceneMotion.motionScale * (reducedMotion ? 0.25 : 1)
    if (!source || !target || fadeRef.current < 0.01) return

    source.getWorldPosition(from)
    target.getWorldPosition(to)
    // A quadratic arc lifted a little (and nudged sideways by a stable seed)
    // so overlapping connections separate instead of stacking.
    mid.addVectors(from, to).multiplyScalar(0.5)
    dir.subVectors(to, from)
    const length = dir.length()
    if (length < 0.01) return
    dir.divideScalar(length)
    side.crossVectors(dir, UP)
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
    side.normalize()
    control.copy(mid).addScaledVector(UP, length * 0.09).addScaledVector(side, length * 0.06 * seed)

    const array = attribute.array as Float32Array
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1)
      a.lerpVectors(from, control, t)
      b.lerpVectors(control, to, t)
      point.lerpVectors(a, b, t)
      array[i * 3] = point.x
      array[i * 3 + 1] = point.y
      array[i * 3 + 2] = point.z
    }
    attribute.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-aT" args={[buffers.ts, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={connectionVertexShader}
        fragmentShader={connectionFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        // Drawn over bodies: a connection must stay readable even when a
        // planet sits between the camera and the far end.
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
