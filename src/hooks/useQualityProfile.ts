import { useMemo } from 'react'

export type QualityTier = 'low' | 'medium' | 'high'

export interface QualityProfile {
  tier: QualityTier
  /** Star counts for the far / mid / near parallax layers. */
  stars: { far: number; mid: number; near: number }
  /** Multiplier applied to each universe's base particle count. */
  universeDetail: number
  /** Upper bound for the canvas device-pixel-ratio. */
  maxDpr: number
  postProcessing: boolean
  /** Whether the pointer is a touch device (no hover parallax). */
  coarsePointer: boolean
  /** Sphere segments for planets at full detail. */
  planetSegments: number
  /** Whether planets get a fresnel atmosphere shell. */
  atmosphere: boolean
  /** Multiplier on per-universe ambient dust. */
  dustDetail: number
  /** Camera distance beyond which website objects collapse to a glow point. */
  lodDistance: number
  /** `prefers-reduced-motion`: shorter flights, calmer orbits, no idle drift. */
  reducedMotion: boolean
}

const PROFILES: Record<QualityTier, Omit<QualityProfile, 'tier' | 'coarsePointer' | 'reducedMotion'>> = {
  high: {
    stars: { far: 14000, mid: 5000, near: 1400 }, universeDetail: 1, maxDpr: 2, postProcessing: true,
    planetSegments: 40, atmosphere: true, dustDetail: 1, lodDistance: 60,
  },
  medium: {
    stars: { far: 8000, mid: 3000, near: 800 }, universeDetail: 0.7, maxDpr: 1.5, postProcessing: true,
    planetSegments: 28, atmosphere: true, dustDetail: 0.6, lodDistance: 48,
  },
  low: {
    stars: { far: 4000, mid: 1400, near: 400 }, universeDetail: 0.45, maxDpr: 1, postProcessing: false,
    planetSegments: 24, atmosphere: false, dustDetail: 0.3, lodDistance: 36,
  },
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium'
  const width = window.innerWidth
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false

  if (width < 640 || memory <= 2 || cores <= 2) return 'low'
  if (width < 1024 || coarse || memory <= 4 || cores <= 4) return 'medium'
  return 'high'
}

/** Picks a render budget once, based on the device. Stable for the session. */
export function useQualityProfile(): QualityProfile {
  return useMemo(() => {
    const tier = detectTier()
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    return { tier, coarsePointer, reducedMotion, ...PROFILES[tier] }
  }, [])
}
