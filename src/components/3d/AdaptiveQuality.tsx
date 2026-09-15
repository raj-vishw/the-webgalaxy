import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import { useSettingsStore } from '../../store/settingsStore'

/** Frame-rate windows: below this average for `WINDOW_SECONDS`, Auto steps a tier down. */
const LOW_FPS = 34
const WINDOW_SECONDS = 6
const MAX_STEPS = 2
/** Ignore the first seconds after entering; shader compilation makes them unrepresentative. */
const SETTLE_SECONDS = 5

/**
 * Auto graphics: watches the real frame rate once the explorer is in control
 * and lowers the tier (at most twice per session) when it stays low. Never
 * steps back up on its own — that would cause visible oscillation.
 */
export function AdaptiveQuality() {
  const frames = useRef(0)
  const elapsed = useRef(0)
  const settled = useRef(0)

  useFrame((_, delta) => {
    const settings = useSettingsStore.getState()
    if (settings.graphics !== 'auto' || settings.autoDowngrade >= MAX_STEPS) return
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
      settings.setAutoDowngrade(settings.autoDowngrade + 1)
      settled.current = 0
    }
  })

  return null
}
