import { createRandom } from '../lib/random'
import type { UniverseDefinition, Vec3, WebsiteDefinition } from '../types/galaxy'
import { importanceFor, sizeFor } from './celestial'

/** Extra spacing between object footprints, in world units. */
const MARGIN = 2.4
/** Candidates tried per object; the best-spaced one wins (blue-noise feel). */
const CANDIDATES = 28
/** A topic needs this many placed websites to become a neighbourhood of its own. */
export const MIN_NEIGHBOURHOOD = 3
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** A cluster of websites sharing a topic, in universe-local space. */
export interface Neighbourhood {
  topic: string
  centre: Vec3
  radius: number
  count: number
}

export interface Placement {
  positions: Map<string, Vec3>
  neighbourhoods: Neighbourhood[]
  /** How much the interior grew to hold its population (1 = the universe's nominal spread). */
  interior: number
}

/**
 * How far a universe's interior stretches for its population: a dozen
 * websites fit the nominal spread, more need room — but never so much that
 * the universe stops reading as one object from the overview.
 */
export function interiorScale(websiteCount: number): number {
  return Math.min(2.1, Math.max(1, Math.pow(websiteCount / 12, 0.46)))
}

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
 * universe centre). Websites that share a topic form a neighbourhood — a
 * loose cluster around its own centre, the centres spread around the
 * interior on a golden-angle spiral — while websites without one (the
 * flagships, and topics too small to stand alone) gather at the core.
 * Within a group, objects are sampled with best-candidate rejection so they
 * spread organically without a grid, high-importance sites drift toward the
 * group's centre, and footprints (including any moons that will orbit them)
 * keep clear of one another. Comets and anchored moons are not placed here —
 * their motion defines their position.
 *
 * Neighbourhoods group; they never rank or nest websites.
 */
export function generatePositions(universe: UniverseDefinition, websites: WebsiteDefinition[]): Placement {
  const rnd = createRandom(universe.seed * 977 + 13)
  const { layout, scale } = universe
  const interior = interiorScale(websites.length)
  const radii = [layout.spread[0] * scale * interior, layout.spread[1] * scale * interior, layout.spread[2] * scale * interior]
  const coreRadius = scale * 0.16
  const positions = new Map<string, Vec3>()

  const moonReach = new Map<string, number>()
  for (const w of websites) {
    const anchor = anchorFor(w, websites)
    if (anchor) moonReach.set(anchor.id, Math.max(moonReach.get(anchor.id) ?? 0, moonOrbitRadius(anchor, w) + sizeFor(w)))
  }

  const toPlace = websites
    .filter((w) => w.objectType !== 'comet' && !anchorFor(w, websites))
    .sort((a, b) => importanceFor(b) - importanceFor(a))

  // ─── Neighbourhoods: which topics are big enough, and where they sit ───────
  const members = new Map<string, number>()
  for (const w of toPlace) if (w.topic) members.set(w.topic, (members.get(w.topic) ?? 0) + 1)
  const topics = [...members.entries()]
    .filter(([, n]) => n >= MIN_NEIGHBOURHOOD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const neighbourhoods: Neighbourhood[] = []
  const centreOf = new Map<string, Neighbourhood>()
  const spiralOffset = rnd.next() * Math.PI * 2
  topics.forEach(([topic, count], i) => {
    const angle = spiralOffset + i * GOLDEN_ANGLE
    // Larger groups sit a little further out, where there is more room.
    const ring = 0.64 + 0.18 * Math.min(1, count / 12) + (i % 2) * 0.08
    const centre: Vec3 = [Math.cos(angle) * radii[0] * ring, (rnd.next() - 0.5) * radii[1] * 0.6, Math.sin(angle) * radii[2] * ring]
    const radius = scale * interior * (0.16 + 0.055 * Math.sqrt(count))
    const n: Neighbourhood = { topic, centre, radius, count }
    neighbourhoods.push(n)
    centreOf.set(topic, n)
  })

  // The core holds the flagships and the small topics: room in proportion.
  const coreCount = toPlace.filter((w) => !w.topic || !centreOf.has(w.topic)).length
  const coreReach = neighbourhoods.length ? Math.min(0.8, 0.3 + 0.09 * Math.sqrt(coreCount)) : 1

  const placed: { p: Vec3; r: number }[] = []

  for (const website of toPlace) {
    const footprint = sizeFor(website) + (moonReach.get(website.id) ?? 0)
    const pull = layout.coreBias * importanceFor(website)
    const home = website.topic ? centreOf.get(website.topic) : undefined
    let best: Vec3 | null = null
    let bestClearance = -Infinity

    for (let i = 0; i < CANDIDATES; i++) {
      const [dx, dy, dz] = rnd.onSphere()
      let candidate: Vec3
      if (home) {
        const radial = (0.2 + 0.8 * Math.pow(rnd.next(), 0.7)) * (1 - 0.3 * pull)
        candidate = [home.centre[0] + dx * home.radius * radial, home.centre[1] + dy * home.radius * 0.6 * radial, home.centre[2] + dz * home.radius * radial]
      } else {
        // The core: the middle of the interior, tighter when neighbourhoods surround it.
        const radial = (0.25 + 0.75 * Math.pow(rnd.next(), 0.6)) * (1 - 0.2 * pull) * coreReach
        candidate = [dx * radii[0] * radial, dy * radii[1] * radial, dz * radii[2] * radial]
      }

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

  return { positions, neighbourhoods, interior }
}
