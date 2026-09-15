import { useEffect, useState } from 'react'
import { skipIntro } from '../../lib/intro'
import { useGalaxyStore } from '../../store/galaxyStore'

/** A faint escape hatch for returning visitors; appears a moment into the intro. */
export function IntroSkip() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 1800)
    return () => window.clearTimeout(id)
  }, [])

  const visible = ready && introPhase === 'playing'

  return (
    <button
      type="button"
      onClick={skipIntro}
      className={[
        'absolute right-6 bottom-6 z-20 sm:right-9 sm:bottom-8',
        'font-sans text-[11px] tracking-[0.22em] uppercase text-space-300/70',
        'transition-[opacity,color] duration-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      Skip
    </button>
  )
}
