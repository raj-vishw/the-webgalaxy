import { useEffect, useState } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import { useSettingsStore } from '../../store/settingsStore'
import { focusRing } from '../ui/panel'

/**
 * The landing: the galaxy is already alive behind a single statement and one
 * action. Nothing here hides the scene — a light scrim only, and it lifts as
 * the flight begins.
 */
export function Landing() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const enterGalaxy = useGalaxyStore((s) => s.enterGalaxy)
  const firstVisit = useSettingsStore((s) => s.firstVisit)
  const [ready, setReady] = useState(false)

  // Let the galaxy reveal breathe for a moment before the button appears.
  useEffect(() => {
    if (introPhase !== 'landing') return
    const id = window.setTimeout(() => setReady(true), 400)
    return () => window.clearTimeout(id)
  }, [introPhase])

  // Enter / Space enter the galaxy without needing the button focused.
  useEffect(() => {
    if (introPhase !== 'landing') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        enterGalaxy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [introPhase, enterGalaxy])

  const visible = introPhase === 'landing'
  const titleUp = visible || introPhase === 'loading'

  return (
    <div
      aria-hidden={!visible}
      className={[
        'absolute inset-0 z-30 flex flex-col items-center justify-center px-6 pb-[10vh] text-center',
        'transition-[opacity,background-color] duration-[1400ms] ease-out',
        visible ? 'bg-space-950/25 opacity-100' : 'pointer-events-none bg-transparent opacity-0',
      ].join(' ')}
    >
      <h1
        className={[
          'font-sans font-light text-white',
          'text-[clamp(2rem,5.6vw,4.8rem)] leading-none',
          'transition-[opacity,transform,letter-spacing] duration-[1800ms] ease-out',
          titleUp ? 'opacity-100 translate-y-0 tracking-[0.34em]' : 'opacity-0 -translate-y-3 tracking-[0.42em]',
        ].join(' ')}
        style={{ textShadow: '0 0 28px rgba(200,214,255,0.35), 0 0 70px rgba(150,170,255,0.18)' }}
      >
        THE WEBGALAXY
      </h1>
      <p
        className={[
          'mt-5 max-w-[26ch] font-sans font-light text-space-100/85',
          'text-[clamp(0.95rem,1.5vw,1.2rem)] leading-relaxed tracking-[0.08em]',
          'transition-[opacity,transform] duration-[1600ms] delay-300 ease-out',
          ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        ].join(' ')}
      >
        Explore the internet
        <br />
        as a living universe.
      </p>
      <button
        type="button"
        onClick={enterGalaxy}
        disabled={!visible}
        className={[
          'mt-10 rounded-full border border-white/35 px-7 py-3 font-sans text-[12px] tracking-[0.3em] uppercase text-white/95',
          'transition-[opacity,transform,border-color,background-color,box-shadow] duration-[1200ms] delay-500 ease-out',
          'hover:border-white/70 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(190,205,255,0.18)] active:scale-[0.98]',
          ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          focusRing,
        ].join(' ')}
      >
        Enter the WebGalaxy
      </button>
      <p className={`mt-6 font-sans text-[10.5px] tracking-[0.22em] uppercase text-space-300/50 transition-opacity duration-[1600ms] delay-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        {firstVisit ? 'A short flight in · press Enter' : 'Press Enter'}
      </p>
    </div>
  )
}
