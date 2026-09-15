/** Small deterministic PRNG (mulberry32) so procedural structures are stable. */
export function createRandom(seed: number) {
  let t = seed >>> 0
  const next = () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    /** Approximate standard normal via Box–Muller. */
    gaussian: () => {
      const u = Math.max(next(), 1e-9)
      const v = next()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
    /** Random unit vector, uniformly distributed on the sphere. */
    onSphere: (): [number, number, number] => {
      const z = next() * 2 - 1
      const a = next() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      return [r * Math.cos(a), r * Math.sin(a), z]
    },
  }
}

export type Random = ReturnType<typeof createRandom>
