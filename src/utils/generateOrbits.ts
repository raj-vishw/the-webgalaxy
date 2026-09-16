import { Vector3 } from 'three'
import { createRandom } from '../lib/random'
import type { UniverseDefinition, Vec3, WebsiteDefinition } from '../types/galaxy'
import { hashString } from './celestial'
import { anchorFor, moonOrbitRadius } from './generatePositions'

interface OrbitBasis {
  /** Orthonormal in-plane axes of the orbit. */
  e1: Vec3
  e2: Vec3
  period: number
  phase: number
  /** Self-rotation, radians per second. */
  spin: number
  /** Axial tilt of the body, radians. */
  tilt: number
}

/** Small elliptical wander around a fixed home position. */
export interface DriftOrbit extends OrbitBasis {
  kind: 'drift'
  home: Vec3
  a: number
  b: number
}

/** Circular path around another website's live position (visual only). */
export interface MoonOrbit extends OrbitBasis {
  kind: 'moon'
  anchorId: string
  radius: number
}

/** Long eccentric ellipse with the universe centre at one focus. */
export interface CometOrbit extends OrbitBasis {
  kind: 'comet'
  a: number
  eccentricity: number
}

export type OrbitSpec = DriftOrbit | MoonOrbit | CometOrbit

const scratch = new Vector3()
const scratchNormal = new Vector3()
const scratchAxis = new Vector3()

function basisFor(rnd: ReturnType<typeof createRandom>, planeScatter: number): { e1: Vec3; e2: Vec3 } {
  const [rx, ry, rz] = rnd.onSphere()
  // Mostly aligned with the galaxy plane, tilted by `planeScatter`.
  scratchNormal.set(rx * planeScatter, 1 + ry * planeScatter * 0.5, rz * planeScatter).normalize()
  scratchAxis.set(1, 0, 0)
  if (Math.abs(scratchNormal.x) > 0.9) scratchAxis.set(0, 0, 1)
  const e1 = scratch.crossVectors(scratchNormal, scratchAxis).normalize()
  const e1v: Vec3 = [e1.x, e1.y, e1.z]
  const e2 = scratch.crossVectors(scratchNormal, e1).normalize()
  return { e1: e1v, e2: [e2.x, e2.y, e2.z] }
}

/**
 * Builds a deterministic orbit for each website in a universe. Motion scales
 * with the universe layout's `energy` so calm universes drift slowly and
 * energetic ones move more.
 */
export function generateOrbits(
  universe: UniverseDefinition,
  websites: WebsiteDefinition[],
  positions: Map<string, Vec3>,
  /** How much the interior grew for its population (see `interiorScale`). */
  interior = 1,
): Map<string, OrbitSpec> {
  const orbits = new Map<string, OrbitSpec>()
  const energy = universe.layout.energy

  for (const website of websites) {
    const rnd = createRandom(hashString(website.id) ^ universe.seed)
    const common = {
      phase: rnd.next() * Math.PI * 2,
      spin: rnd.range(0.05, 0.12) * (rnd.next() > 0.2 ? 1 : -1),
      tilt: rnd.range(-0.45, 0.45),
    }

    const anchor = anchorFor(website, websites)
    if (anchor) {
      orbits.set(website.id, {
        kind: 'moon',
        anchorId: anchor.id,
        radius: moonOrbitRadius(anchor, website),
        period: rnd.range(55, 110) / energy,
        ...basisFor(rnd, 0.7),
        ...common,
      })
      continue
    }

    if (website.objectType === 'comet') {
      orbits.set(website.id, {
        kind: 'comet',
        a: universe.scale * interior * rnd.range(0.8, 1.05),
        eccentricity: rnd.range(0.4, 0.6),
        period: rnd.range(150, 230) / energy,
        ...basisFor(rnd, 1.3),
        ...common,
      })
      continue
    }

    const a = rnd.range(0.4, 0.85) * Math.min(1.4, energy)
    orbits.set(website.id, {
      kind: 'drift',
      home: positions.get(website.id) ?? [0, 0, 0],
      a,
      b: a * rnd.range(0.5, 0.9),
      period: rnd.range(110, 240) / energy,
      ...basisFor(rnd, 0.6),
      ...common,
    })
  }

  return orbits
}

/**
 * Evaluates an orbit at local time `t` (seconds) into `out`. Moons need their
 * anchor's current local position.
 */
export function orbitPosition(spec: OrbitSpec, t: number, out: Vector3, anchorPosition?: Vector3): Vector3 {
  const angle = spec.phase + (Math.PI * 2 * t) / spec.period
  const c = Math.cos(angle)
  const s = Math.sin(angle)

  switch (spec.kind) {
    case 'drift':
      return out
        .set(spec.home[0], spec.home[1], spec.home[2])
        .addScaledVector(scratch.set(...spec.e1), spec.a * c)
        .addScaledVector(scratch.set(...spec.e2), spec.b * s)
    case 'moon':
      out.copy(anchorPosition ?? scratch.set(0, 0, 0))
      return out
        .addScaledVector(scratch.set(...spec.e1), spec.radius * c)
        .addScaledVector(scratch.set(...spec.e2), spec.radius * s)
    case 'comet': {
      // Eccentric-anomaly parametrisation: naturally faster near the focus.
      const b = spec.a * Math.sqrt(1 - spec.eccentricity * spec.eccentricity)
      return out
        .set(0, 0, 0)
        .addScaledVector(scratch.set(...spec.e1), spec.a * (c - spec.eccentricity))
        .addScaledVector(scratch.set(...spec.e2), b * s)
    }
  }
}
