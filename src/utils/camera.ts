import { MathUtils, Vector3 } from 'three'
import type { CelestialObjectType, UniverseDefinition, WebsiteDefinition } from '../types/galaxy'
import { sizeFor } from './celestial'

export interface CameraPose {
  position: Vector3
  target: Vector3
}

/** Resting overview for landscape viewports: in front of and above the galaxy. */
const LANDSCAPE_DIRECTION = new Vector3(0, 34, 118).normalize()
/**
 * Portrait viewports look almost straight down from the side, so the galaxy's
 * long axis runs down the screen instead of being squeezed across it.
 */
const PORTRAIT_DIRECTION = new Vector3(-0.174, 0.985, 0).normalize()
const OVERVIEW_DISTANCE = 124
const LANDSCAPE_TARGET = new Vector3(0, 0, 0)
/** Centre of the layout's depth range, so the portrait framing is balanced. */
const PORTRAIT_TARGET = new Vector3(0, 0, -20)

/** Viewing distance when focusing a website, by object type (× size + base). */
const WEBSITE_VIEW: Record<CelestialObjectType, { perSize: number; base: number }> = {
  star: { perSize: 14, base: 9 },
  planet: { perSize: 6.5, base: 3 },
  moon: { perSize: 8, base: 3 },
  comet: { perSize: 7, base: 6 },
}
/** Viewing distance when entering a universe, as a multiple of its scale. */
const UNIVERSE_VIEW_FACTOR = 3

/**
 * The resting galaxy overview for the current aspect ratio. Horizontal field
 * of view shrinks with aspect, so narrower viewports sit further back; portrait
 * also switches to the side-on framing.
 */
export function overviewFor(aspect: number): CameraPose {
  if (aspect < 1) {
    const factor = MathUtils.clamp(1.38 / aspect, 1.5, 3.6)
    const target = PORTRAIT_TARGET.clone()
    return { target, position: PORTRAIT_DIRECTION.clone().multiplyScalar(OVERVIEW_DISTANCE * factor).add(target) }
  }
  const factor = MathUtils.clamp(1.7 / aspect, 1, 2.2)
  const target = LANDSCAPE_TARGET.clone()
  return { target, position: LANDSCAPE_DIRECTION.clone().multiplyScalar(OVERVIEW_DISTANCE * factor).add(target) }
}

const scratch = new Vector3()

/**
 * Approach direction: keep the side the camera is already on (no swinging
 * around the target) but stay a little elevated so the view reads as 3D.
 */
export function approachDirection(from: Vector3, focus: Vector3, minElevation: number, out = new Vector3()) {
  out.subVectors(from, focus)
  if (out.lengthSq() < 1e-6) out.set(0, 0.4, 1)
  out.normalize()
  if (out.y < minElevation) out.y = minElevation
  return out.normalize()
}

export function universeViewDistance(universe: UniverseDefinition): number {
  return universe.scale * UNIVERSE_VIEW_FACTOR
}

export function websiteViewDistance(website: WebsiteDefinition): number {
  const view = WEBSITE_VIEW[website.objectType]
  return sizeFor(website) * view.perSize + view.base
}

/** Flight duration from the distance travelled: never a cut, never a crawl. */
export function flightDuration(travel: number, reducedMotion: boolean): number {
  const base = MathUtils.clamp(travel / 55, 1.4, 3.4)
  return reducedMotion ? Math.min(base, 0.9) : base
}

/** Vertical arc added to long flights so they don't read as a straight zoom. */
export function flightLift(travel: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : Math.min(travel * 0.12, 18)
}

/** Position at `distance` from `focus` along `direction`, into `out`. */
export function poseFrom(focus: Vector3, direction: Vector3, distance: number, out = scratch) {
  return out.copy(focus).addScaledVector(direction, distance)
}
