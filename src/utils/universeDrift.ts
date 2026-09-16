import type { Vector3 } from 'three'
import { createRandom } from '../lib/random'
import type { UniverseDefinition } from '../types/galaxy'

/** How far a universe wanders from its laid-out position, in world units. */
const AMPLITUDE_XZ = 5.5
const AMPLITUDE_Y = 2.2

interface DriftParams {
  ax: number
  az: number
  ay: number
  wx: number
  wz: number
  wy: number
  px: number
  pz: number
  py: number
}

const cache = new Map<string, DriftParams>()

function paramsFor(universe: UniverseDefinition): DriftParams {
  let p = cache.get(universe.id)
  if (!p) {
    const rnd = createRandom(universe.seed * 131 + 7)
    // Slow Lissajous wander: incommensurate periods so the path never repeats visibly.
    p = {
      ax: AMPLITUDE_XZ * rnd.range(0.7, 1),
      az: AMPLITUDE_XZ * rnd.range(0.7, 1),
      ay: AMPLITUDE_Y * rnd.range(0.6, 1),
      wx: (Math.PI * 2) / rnd.range(48, 84),
      wz: (Math.PI * 2) / rnd.range(56, 96),
      wy: (Math.PI * 2) / rnd.range(30, 60),
      px: rnd.next() * Math.PI * 2,
      pz: rnd.next() * Math.PI * 2,
      py: rnd.next() * Math.PI * 2,
    }
    cache.set(universe.id, p)
  }
  return p
}

/**
 * A universe's live position: its laid-out home plus a slow, deterministic
 * drift. The whole galaxy breathes instead of standing on a grid, yet every
 * universe stays within a few units of the spot the layout was checked at.
 * `t` is `sceneMotion.driftTime`, which only advances in the galaxy overview.
 */
export function driftedPosition(universe: UniverseDefinition, t: number, out: Vector3): Vector3 {
  const p = paramsFor(universe)
  const [x, y, z] = universe.position
  return out.set(
    x + p.ax * Math.sin(t * p.wx + p.px),
    y + p.ay * Math.sin(t * p.wy + p.py),
    z + p.az * Math.sin(t * p.wz + p.pz),
  )
}
