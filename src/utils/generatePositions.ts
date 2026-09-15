import { createRandom } from '../lib/random'
import type { UniverseDefinition, Vec3, WebsiteDefinition } from '../types/galaxy'
import { sizeFor } from './celestial'

/** Extra spacing between object footprints, in world units. */
const MARGIN = 2.4
/** Candidates tried per object; the best-spaced one wins (blue-noise feel). */
const CANDIDATES = 28

/** Distance a moon keeps from the website it orbits (visual only). */
export function moonOrbitRadius(anchor: WebsiteDefinition, moon: WebsiteDefinition): number {
  return sizeFor(anchor) * 2.3 + sizeFor(moon) * 1.6
}

/**
 * Whether a moon has a valid anchor in its universe. Moons without one are
 * placed like any other free-floating object.
 */
export function anchorFor(moon: WebsiteDefinition, siblings: WebsiteDefinition[]): WebsiteDefinition | null {
  if (moon.objectType !== 'moon' || !moon.orbitAnchorId) return null
  return siblings.find((w) => w.id === moon.orbitAnchorId && w.objectType !== 'moon' && w.objectType !== 'comet') ?? null
}

/**
 * Procedurally places a universe's websites in local space (relative to the
 * universe centre). Objects are sampled inside the universe's layout ellipsoid
 * with best-candidate rejection so they spread organically without a grid,
 * high-importance sites drift toward the core, and footprints (including any
 * moons that will orbit them) keep clear of one another. Comets and anchored
 * moons are not placed here — their motion defines their position.
 */
export function generatePositions(
  universe: UniverseDefinition,
  websites: WebsiteDefinition[],
): Map<string, Vec3> {
  const rnd = createRandom(universe.seed * 977 + 13)
  const { layout, scale } = universe
  const radii = [layout.spread[0] * scale, layout.spread[1] * scale, layout.spread[2] * scale]
  const coreRadius = scale * 0.16
  const positions = new Map<string, Vec3>()

  const moonReach = new Map<string, number>()
  for (const w of websites) {
    const anchor = anchorFor(w, websites)
    if (anchor) moonReach.set(anchor.id, Math.max(moonReach.get(anchor.id) ?? 0, moonOrbitRadius(anchor, w) + sizeFor(w)))
  }

  const toPlace = websites
    .filter((w) => w.objectType !== 'comet' && !anchorFor(w, websites))
    .sort((a, b) => b.importance - a.importance)

  const placed: { p: Vec3; r: number }[] = []

  for (const website of toPlace) {
    const footprint = sizeFor(website) + (moonReach.get(website.id) ?? 0)
    const pull = layout.coreBias * (website.importance / 100)
    let best: Vec3 | null = null
    let bestClearance = -Infinity

    for (let i = 0; i < CANDIDATES; i++) {
      const [dx, dy, dz] = rnd.onSphere()
      const radial = (0.3 + 0.7 * Math.pow(rnd.next(), 0.75)) * (1 - 0.35 * pull)
      const candidate: Vec3 = [dx * radii[0] * radial, dy * radii[1] * radial, dz * radii[2] * radial]

      let clearance = Math.hypot(...candidate) - coreRadius - footprint
      for (const other of placed) {
        const d = Math.hypot(candidate[0] - other.p[0], candidate[1] - other.p[1], candidate[2] - other.p[2])
        clearance = Math.min(clearance, d - (footprint + other.r) - MARGIN)
      }
      if (clearance > bestClearance) {
        bestClearance = clearance
        best = candidate
      }
    }

    placed.push({ p: best!, r: footprint })
    positions.set(website.id, best!)
  }

  return positions
}
