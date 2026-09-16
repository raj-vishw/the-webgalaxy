/**
 * Per-frame state of one website object, written by `CelestialObject` and
 * read by its visual body. Lives in a ref so nothing re-renders at 60 fps.
 */
export interface CelestialFrameState {
  /** 0 → 1: distance fade × universe-entry reveal. */
  visibility: number
  /** Eased hover amount. */
  hover: number
  /** Eased "another website is focused" dimming. */
  dim: number
  /** Eased "this website is focused" emphasis. */
  focus: number
  /** Local orbit time in seconds (slows while hovered). */
  time: number
  /** Camera distance and world radius, so bodies can adapt to close-ups. */
  distance: number
  size: number
  /** point → glow only; full → body; detail → body plus close-up extras. */
  lod: 'point' | 'full' | 'detail'
  /** 0 → 1: label visibility after screen-space decluttering. */
  label: number
  /** Cached label box (CSS px) so layout isn't read every frame. */
  labelBox: [width: number, height: number]
  frames: number
}

export const createCelestialFrameState = (): CelestialFrameState => ({
  visibility: 0,
  hover: 0,
  dim: 0,
  focus: 0,
  time: 0,
  distance: Infinity,
  size: 1,
  lod: 'point',
  label: 1,
  labelBox: [0, 0],
  frames: 0,
})
