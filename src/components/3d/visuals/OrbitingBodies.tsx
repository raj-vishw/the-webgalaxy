import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { AdditiveBlending, BufferAttribute, Color, ShaderMaterial } from 'three'
import type { OrbitBody } from '../../../lib/universeGeometry'
import { universeFragmentShader, universeVertexShader } from '../shaders/pointShaders'
import type { UniverseFrameState } from './universeFrame'

interface OrbitingBodiesProps {
  bodies: OrbitBody[]
  frame: RefObject<UniverseFrameState>
  pixelRatio: number
}

/** A handful of bright points that slowly orbit the central star. */
export function OrbitingBodies({ bodies, frame, pixelRatio }: OrbitingBodiesProps) {
  const positionRef = useRef<BufferAttribute>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  const buffers = useMemo(() => {
    const n = bodies.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const alphas = new Float32Array(n)
    const seeds = new Float32Array(n)
    const c = new Color()
    bodies.forEach((body, i) => {
      c.set(body.color)
      colors.set([c.r, c.g, c.b], i * 3)
      sizes[i] = body.size
      alphas[i] = 0.95
      seeds[i] = i / n
    })
    return { positions, colors, sizes, alphas, seeds }
  }, [bodies])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uDim: { value: 0 },
    }),
    [pixelRatio],
  )

  useFrame(({ clock }) => {
    const attribute = positionRef.current
    const material = materialRef.current
    if (!attribute || !material) return
    const t = clock.elapsedTime
    const array = attribute.array as Float32Array
    bodies.forEach((body, i) => {
      const a = body.phase + t * body.speed
      array[i * 3] = Math.cos(a) * body.radius
      array[i * 3 + 1] = Math.sin(a) * body.radius * body.inclination
      array[i * 3 + 2] = Math.sin(a) * body.radius
    })
    attribute.needsUpdate = true
    material.uniforms.uTime.value = t
    material.uniforms.uReveal.value = frame.current.reveal
    material.uniforms.uHover.value = frame.current.hover
    material.uniforms.uDim.value = frame.current.dim
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[buffers.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={universeVertexShader}
        fragmentShader={universeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
