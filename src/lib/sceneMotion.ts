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
  /** 0 → 1: universe labels; held back behind the landing title, revealed during the flight. */
  labelReveal: 0,
  /** Normalised pointer position in [-1, 1], smoothed by the parallax rig. */
  pointer: { x: 0, y: 0 },
  /** Whether the user is actively dragging the camera. */
  dragging: false,
  /** Global multiplier on continuous motion (orbits, drift, spin); reduced-motion lowers it. */
  motionScale: 1,
  /** Clock behind the universes' slow wander; advances only in the galaxy overview so an entered universe holds still. */
  driftTime: 0,
  /**
   * Visual emphasis driven by search, discovery and travel: emphasised ids
   * glow, everything else quietens by `dimOthers`. Written by `EmphasisBridge`
   * from store state; read in frame loops — never React state.
   */
  emphasis: {
    active: false,
    websiteIds: new Set<string>(),
    universeIds: new Set<string>(),
    dimOthers: 0,
  },
  /** Active filters: websites not in the set recede and stop responding. */
  filter: { active: false, websiteIds: new Set<string>() },
  /**
   * Websites at the far end of the connections currently drawn. They keep a
   * minimum presence (even across the galaxy) so a line never points at
   * nothing. Milder than `emphasis`; the two combine.
   */
  relations: { active: false, websiteIds: new Set<string>() },
  /** Camera pose sampled each frame for the minimap (top-down x/z and heading). */
  camera: { x: 0, z: 0, headingX: 0, headingZ: -1 },
  /**
   * Per-universe entry reveal (0 → 1), animated when the camera travels into a
   * universe so its websites appear in stages. Absent = fully revealed.
   */
  universeEntry: {} as Record<string, number>,
  /** Extra distance the camera keeps from an entered universe on narrow viewports (1 = none); detail levels follow it. */
  universeFraming: 1,
}
