import { Color } from 'three'
import type { Random } from '../random'

/** Sequential writer for interleaved particle attributes. */
export class ParticleWriter {
  readonly positions: Float32Array
  readonly colors: Float32Array
  readonly sizes: Float32Array
  readonly alphas: Float32Array
  readonly seeds: Float32Array
  readonly capacity: number
  private readonly random: Random
  private index = 0

  constructor(capacity: number, random: Random) {
    this.capacity = capacity
    this.random = random
    this.positions = new Float32Array(capacity * 3)
    this.colors = new Float32Array(capacity * 3)
    this.sizes = new Float32Array(capacity)
    this.alphas = new Float32Array(capacity)
    this.seeds = new Float32Array(capacity)
  }

  get count() {
    return this.index
  }

  push(x: number, y: number, z: number, color: Color, size: number, alpha: number) {
    if (this.index >= this.capacity) return
    const i = this.index++
    this.positions[i * 3] = x
    this.positions[i * 3 + 1] = y
    this.positions[i * 3 + 2] = z
    this.colors[i * 3] = color.r
    this.colors[i * 3 + 1] = color.g
    this.colors[i * 3 + 2] = color.b
    this.sizes[i] = size
    this.alphas[i] = alpha
    this.seeds[i] = this.random.next()
  }

  /** Trims the buffers to the number of particles actually written. */
  finish() {
    const n = this.index
    return {
      count: n,
      positions: this.positions.subarray(0, n * 3),
      colors: this.colors.subarray(0, n * 3),
      sizes: this.sizes.subarray(0, n),
      alphas: this.alphas.subarray(0, n),
      seeds: this.seeds.subarray(0, n),
    }
  }
}

const scratch = new Color()

/** Blends between two colours into a reusable scratch instance. */
export function mixColor(a: Color, b: Color, t: number) {
  return scratch.copy(a).lerp(b, t)
}
