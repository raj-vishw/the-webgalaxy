export interface PerfSample {
  fps: number
  frameMs: number
  calls: number
  triangles: number
  points: number
  geometries: number
  textures: number
  heapMb: number | null
}

const listeners = new Set<(sample: PerfSample) => void>()

/** Development performance samples, published once a second by `PerfMonitor`. */
export const perfSamples = {
  subscribe(fn: (sample: PerfSample) => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

export function publishPerfSample(sample: PerfSample) {
  for (const fn of listeners) fn(sample)
}

