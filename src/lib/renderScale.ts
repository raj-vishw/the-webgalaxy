import type { QualityTier } from '../hooks/useQualityProfile'

/**
 * Dynamic resolution. The scene is fill-rate bound — thousands of soft,
 * additive particles plus bloom — so the frame rate follows the number of
 * device pixels almost exactly. Instead of rendering at the screen's full
 * pixel ratio, the canvas is rendered to a pixel *budget* per quality tier
 * and then nudged up or down from the measured frame rate. Labels and UI are
 * HTML, so they stay crisp whatever the canvas resolution.
 *
 * Read by the scene and by `AdaptiveQuality`, which only lowers the tier once
 * resolution has no more to give. Plain object: per-frame code reads it
 * without React.
 */
export const renderScale = {
  /** Current canvas device-pixel-ratio. */
  dpr: 1,
  /** Lowest ratio the governor will go to before the tier steps down. */
  floor: 0.6,
  /** Ratio the budget allows for the current viewport (the governor's ceiling). */
  baseline: 1,
}

/** Device pixels per frame each tier is allowed at rest. */
const PIXEL_BUDGET: Record<QualityTier, number> = { high: 2_200_000, medium: 1_500_000, low: 1_000_000 }

/** Quantised to twentieths so tiny corrections never trigger a resize. */
export const quantiseDpr = (dpr: number) => Math.round(dpr * 20) / 20

/** The ratio that keeps a viewport within its tier's pixel budget, never above the device's own. */
export function baselineDpr(tier: QualityTier, width: number, height: number, maxDpr: number): number {
  const device = Math.min(window.devicePixelRatio || 1, maxDpr)
  const budget = Math.sqrt(PIXEL_BUDGET[tier] / Math.max(1, width * height))
  return quantiseDpr(Math.min(device, Math.max(renderScale.floor, budget)))
}
