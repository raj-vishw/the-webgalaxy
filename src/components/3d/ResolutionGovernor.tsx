import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { QualityProfile } from '../../hooks/useQualityProfile'
import { baselineDpr, quantiseDpr, renderScale } from '../../lib/renderScale'
import { useGalaxyStore } from '../../store/galaxyStore'

interface ResolutionGovernorProps {
  profile: QualityProfile
  dpr: number
  onChange: (dpr: number) => void
}

/** Measure over windows this long; act on each. */
const WINDOW_SECONDS = 1
/** Below this the resolution steps down at once … */
const LOW_FPS = 48
/** … and it only creeps back up after this many consecutive windows above this. */
const HIGH_FPS = 57
const GOOD_WINDOWS = 3
const STEP_DOWN = 0.15
const STEP_UP = 0.05
/** Shader compilation makes the first seconds after entering unrepresentative. */
const SETTLE_SECONDS = 3

/**
 * Keeps the canvas at the largest resolution the device can draw smoothly:
 * starts from the tier's pixel budget for this viewport, drops quickly when
 * the frame rate sags, recovers slowly when there is headroom. Resolution is
 * the cheapest lever there is — no remount, no shader recompile — so it is
 * tried before `AdaptiveQuality` lowers the whole tier.
 */
export function ResolutionGovernor({ profile, dpr, onChange }: ResolutionGovernorProps) {
  const size = useThree((s) => s.size)
  const frames = useRef(0)
  const elapsed = useRef(0)
  const settled = useRef(0)
  const good = useRef(0)

  // Viewport or tier changed: the budget moves, and so does the ceiling.
  useEffect(() => {
    const baseline = baselineDpr(profile.tier, size.width, size.height, profile.maxDpr)
    renderScale.baseline = baseline
    if (dpr > baseline || dpr < renderScale.floor) onChange(baseline)
    settled.current = 0
  }, [profile.tier, profile.maxDpr, size.width, size.height, dpr, onChange])

  useFrame((_, delta) => {
    renderScale.dpr = dpr
    if (useGalaxyStore.getState().introPhase !== 'complete' || document.visibilityState !== 'visible') return
    if (settled.current < SETTLE_SECONDS) {
      settled.current += delta
      return
    }
    frames.current += 1
    elapsed.current += delta
    if (elapsed.current < WINDOW_SECONDS) return
    const fps = frames.current / elapsed.current
    frames.current = 0
    elapsed.current = 0
    if (fps < LOW_FPS) {
      good.current = 0
      const next = quantiseDpr(Math.max(renderScale.floor, dpr - STEP_DOWN))
      if (next < dpr) {
        onChange(next)
        settled.current = SETTLE_SECONDS - 1
      }
    } else if (fps >= HIGH_FPS && dpr < renderScale.baseline) {
      if (++good.current >= GOOD_WINDOWS) {
        good.current = 0
        onChange(quantiseDpr(Math.min(renderScale.baseline, dpr + STEP_UP)))
      }
    } else good.current = 0
  })

  return null
}
