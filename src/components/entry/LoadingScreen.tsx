import { useEffect, useState } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'

/** Progress the visitor can feel: what is being prepared, and how far along. */
const STAGES = [
  { key: 'scene', label: 'Creating space', to: 30 },
  { key: 'universes', label: 'Loading universes', to: 55 },
  { key: 'websites', label: 'Mapping websites', to: 80 },
  { key: 'relationships', label: 'Connecting the galaxy', to: 95 },
  { key: 'ready', label: 'Ready', to: 100 },
] as const

const MIN_VISIBLE_MS = 1100

/**
 * The first thing on screen: a dark field with the wordmark, a stage line and
 * a percentage. It lifts as soon as the scene exists and the first data is
 * in (or has failed — the galaxy renders from the bundled catalogue then).
 */
export function LoadingScreen() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const sceneReady = useGalaxyStore((s) => s.sceneReady)
  const showLanding = useGalaxyStore((s) => s.showLanding)
  const status = useCatalogStore((s) => s.status)
  const step = useCatalogStore((s) => s.step)
  const [mountedAt] = useState(() => performance.now())
  const [gone, setGone] = useState(false)

  const dataDone = status === 'ready' || status === 'error'
  const stageIndex = !sceneReady ? 0 : dataDone ? 4 : step === 'websites' ? 2 : step === 'relationships' ? 3 : 1
  const stage = STAGES[stageIndex]
  // Eased so it always moves, never jumps to 100 before the stage is really done.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const target = stage.to
    // Ready snaps home; earlier stages ease so the number is always moving.
    const rate = target === 100 ? 0.45 : 0.18
    const id = window.setInterval(() => setShown((v) => (v >= target ? v : Math.min(target, v + Math.max(1, (target - v) * rate)))), 60)
    return () => window.clearInterval(id)
  }, [stage.to])

  useEffect(() => {
    if (introPhase !== 'loading' || !sceneReady || !dataDone) return
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - mountedAt))
    const id = window.setTimeout(showLanding, wait + 250)
    return () => window.clearTimeout(id)
  }, [introPhase, sceneReady, dataDone, mountedAt, showLanding])

  const visible = introPhase === 'loading'
  useEffect(() => {
    if (visible) return
    const id = window.setTimeout(() => setGone(true), 900)
    return () => window.clearTimeout(id)
  }, [visible])

  if (gone) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={['absolute inset-0 z-50 flex flex-col items-center justify-center bg-space-950 text-center', 'transition-opacity duration-[900ms] ease-out', visible ? 'opacity-100' : 'pointer-events-none opacity-0'].join(' ')}
    >
      <p className="font-sans text-[11px] tracking-[0.42em] text-white/80 sm:text-[12px]">THE WEBGALAXY</p>
      <p className="mt-8 font-sans text-[13px] tracking-[0.18em] text-space-300/80 uppercase">{stage.label}…</p>
      <div aria-hidden className="mt-6 flex items-center gap-3 text-[10px] text-white/60">
        {STAGES.slice(0, 4).map((s, i) => (
          <span key={s.key} className={`transition-opacity duration-700 ${i <= stageIndex ? 'opacity-100' : 'opacity-25'}`}>
            ✦
          </span>
        ))}
      </div>
      <p className="mt-5 font-sans text-[12px] tabular-nums tracking-[0.2em] text-space-300/60">{Math.round(shown)}%</p>
    </div>
  )
}
