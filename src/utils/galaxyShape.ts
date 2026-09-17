/**
 * The shape of The WebGalaxy as a whole — shared by the layout generator
 * (`npm run layout`), the galactic dust disc and the universes' rotation so
 * they all agree on where the arms are.
 */
export const ARM_COUNT = 4
/** Radius where the arms begin and end, in world units. */
export const ARM_INNER = 46
export const ARM_OUTER = 196
/** How far each arm winds around the centre from start to end, in radians. */
export const ARM_WIND = 2.6
/** The disc is an ellipse, squashed along z so it reads wider than tall from the tilted overview. */
export const DISC_DEPTH = 0.72

/** Angle of arm `k` at fraction `t` (0 = inner end, 1 = outer end) of its length. */
export function armAngle(k: number, t: number): number {
  return (k * Math.PI * 2) / ARM_COUNT + ARM_WIND * t
}

/** Radius of an arm at fraction `t` of its length. */
export function armRadius(t: number): number {
  return ARM_INNER + (ARM_OUTER - ARM_INNER) * t
}
