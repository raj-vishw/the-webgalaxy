import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { perfSamples, publishPerfSample, type PerfSample } from '../../lib/perf'

/**
 * Development-only: samples the renderer once a second (fps, frame time,
 * draw calls, primitives, resource counts, JS heap when the browser exposes
 * it) and publishes to `perfSamples`. Nothing here ships to users.
 */
export function PerfMonitor() {
  const frames = useRef(0)
  const elapsed = useRef(0)
  const worst = useRef(0)

  useFrame(({ gl }, delta) => {
    // Counters accumulate across the whole second; reset by hand.
    gl.info.autoReset = false
    frames.current += 1
    elapsed.current += delta
    worst.current = Math.max(worst.current, delta)
    if (elapsed.current < 1) {
      gl.info.reset()
      return
    }
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    const sample: PerfSample = {
      fps: Math.round(frames.current / elapsed.current),
      frameMs: Math.round((elapsed.current / frames.current) * 1000 * 10) / 10,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      points: gl.info.render.points,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      heapMb: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
    }
    publishPerfSample(sample)
    frames.current = 0
    elapsed.current = 0
    worst.current = 0
    gl.info.reset()
  })

  return null
}

/** The DOM readout for `PerfMonitor` (toggle with P in development). */
export function PerfReadout({ visible }: { visible: boolean }) {
  const [sample, setSample] = useState<PerfSample | null>(null)
  useEffect(() => perfSamples.subscribe(setSample), [])
  if (!visible || !sample) return null
  return (
    <pre className="pointer-events-none absolute top-24 right-9 z-50 rounded-md border border-white/10 bg-black/70 px-3 py-2 font-mono text-[11px] leading-5 text-white/85">
      {`fps ${sample.fps}  ${sample.frameMs} ms
calls ${sample.calls}  tris ${sample.triangles}  pts ${sample.points}
geom ${sample.geometries}  tex ${sample.textures}${sample.heapMb !== null ? `\nheap ${sample.heapMb} MB` : ''}`}
    </pre>
  )
}
