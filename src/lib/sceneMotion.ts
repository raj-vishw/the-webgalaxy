/**
 * Per-frame motion values shared between the intro timeline, the camera and
 * the shaders. These change every frame, so they deliberately live outside
 * React state / Zustand to avoid re-rendering the tree at 60 fps. Components
 * read them inside `useFrame`.
 */
export const sceneMotion = {
  /** 0 → 1: how much of the starfield has faded in. */
  starReveal: 0,
  /** 0 → 1: staggered reveal of the universes. */
  universeReveal: 0,
  /** Normalised pointer position in [-1, 1], smoothed by the parallax rig. */
  pointer: { x: 0, y: 0 },
  /** Whether the user is actively dragging the camera. */
  dragging: false,
  /** Global multiplier on continuous motion (orbits, drift, spin); reduced-motion lowers it. */
  motionScale: 1,
  /**
   * Per-universe entry reveal (0 → 1), animated when the camera travels into a
   * universe so its websites appear in stages. Absent = fully revealed.
   */
  universeEntry: {} as Record<string, number>,
}
