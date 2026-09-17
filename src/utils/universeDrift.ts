import type { Vector3 } from 'three'
import { createRandom } from '../lib/random'
import { ARM_INNER, ARM_OUTER, DISC_DEPTH } from './galaxyShape'
import type { UniverseDefinition } from '../types/galaxy'

/** How far a universe wanders from its laid-out position, in world units. */
const AMPLITUDE_XZ = 13
const AMPLITUDE_Y = 5
/**
 * Galactic rotation: the innermost universes complete one turn in this many
 * seconds; further out the turn is slower (a flat rotation curve, like a real
 * disc), so the arms slowly wind — that is what makes a spiral look alive.
 */
const INNER_PERIOD = 540
const INNER_RADIUS = ARM_INNER
/** How much slower the outer edge turns than the inner edge (0 = rigid disc). */
const SHEAR = 0.4
const OUTER_RADIUS = ARM_OUTER
/** The rotation curve, for anything else that must turn with the galaxy (the dust disc). */
export const ROTATION = { innerPeriod: INNER_PERIOD, shear: SHEAR } as const

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
  /** Home position in polar form: radius, angle, height. */
  r: number
  angle: number
  /** Angular speed in radians per second at this radius. */
  omega: number
}

const cache = new Map<string, DriftParams>()

function paramsFor(universe: UniverseDefinition): DriftParams {
  let p = cache.get(universe.id)
  const [x, , z] = universe.position
  const zc = z / DISC_DEPTH
  if (!p || p.r !== Math.hypot(x, zc)) {
    const rnd = createRandom(universe.seed * 131 + 7)
    const r = Math.hypot(x, zc)
    const shear = Math.min(1, Math.max(0, (r - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS)))
    p = {
      // Slow Lissajous wander: incommensurate periods so the path never repeats visibly.
      ax: AMPLITUDE_XZ * rnd.range(0.7, 1),
      az: AMPLITUDE_XZ * rnd.range(0.7, 1),
      ay: AMPLITUDE_Y * rnd.range(0.6, 1),
      wx: (Math.PI * 2) / rnd.range(22, 40),
      wz: (Math.PI * 2) / rnd.range(26, 46),
      wy: (Math.PI * 2) / rnd.range(18, 34),
      px: rnd.next() * Math.PI * 2,
      pz: rnd.next() * Math.PI * 2,
      py: rnd.next() * Math.PI * 2,
      r,
      angle: Math.atan2(zc, x),
      omega: ((Math.PI * 2) / INNER_PERIOD) * (1 - SHEAR * shear),
    }
    cache.set(universe.id, p)
  }
  return p
}

/**
 * A universe's live position: its laid-out home carried around the galactic
 * centre by the slow differential rotation, plus a gentle three-axis wander.
 * Deterministic in `t` (`sceneMotion.driftTime`, which only advances in the
 * galaxy overview), so every part of the scene agrees on where a universe is.
 */
export function driftedPosition(universe: UniverseDefinition, t: number, out: Vector3): Vector3 {
  const p = paramsFor(universe)
  const angle = p.angle + p.omega * t
  return out.set(
    Math.cos(angle) * p.r + p.ax * Math.sin(t * p.wx + p.px),
    universe.position[1] + p.ay * Math.sin(t * p.wy + p.py),
    Math.sin(angle) * p.r * DISC_DEPTH + p.az * Math.sin(t * p.wz + p.pz),
  )
}
