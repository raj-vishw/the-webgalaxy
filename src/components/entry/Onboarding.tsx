import { useEffect, useState } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import { focusRing, ghostButton } from '../ui/panel'

const CARDS = [
  { title: 'Welcome to The WebGalaxy.', body: 'Every universe you see is a category of the web. They are all equals — none contains another.' },
  { title: 'Every celestial object is a website.', body: 'Brighter, larger bodies are more prominent sites. Tap or click one to focus it; its connections light up around it.' },
  { title: 'Explore freely.', body: 'Drag to look around, scroll or pinch to travel, and press / to search. Discover lets the galaxy choose your next stop.' },
]

/**
 * Three short cards for first-time visitors, shown once after the cinematic.
 * Skippable at every step; never a gate for anything else.
 */
export function Onboarding() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const complete = useGalaxyStore((s) => s.completeOnboarding)
  const [index, setIndex] = useState(0)
  const visible = introPhase === 'onboarding'
  const last = index === CARDS.length - 1

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') complete()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') setIndex((i) => (i === CARDS.length - 1 ? (complete(), i) : i + 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, complete])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      aria-hidden={!visible}
      className={['absolute inset-0 z-30 flex items-end justify-center px-4 pb-10 sm:items-center sm:pb-0', 'transition-opacity duration-700', visible ? 'opacity-100' : 'pointer-events-none opacity-0'].join(' ')}
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#070a18]/70 px-7 pt-7 pb-6 text-center backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
        <div aria-hidden className="mb-5 flex justify-center gap-2">
          {CARDS.map((_, i) => (
            <span key={i} className={`h-1 w-6 rounded-full transition-colors duration-500 ${i === index ? 'bg-white/80' : 'bg-white/15'}`} />
          ))}
        </div>
        <h2 key={index} className="label-enter font-sans text-[18px] font-light tracking-[0.06em] text-white">
          {CARDS[index].title}
        </h2>
        <p className="mt-3 font-sans text-[13.5px] leading-6 text-space-100/80">{CARDS[index].body}</p>
        <div className="mt-7 flex items-center justify-between">
          <button type="button" onClick={complete} className={`rounded-sm font-sans text-[11px] tracking-[0.2em] uppercase text-space-300/70 transition-colors hover:text-white ${focusRing}`}>
            Skip
          </button>
          <button type="button" onClick={() => (last ? complete() : setIndex(index + 1))} className={`${ghostButton} border-white/30`}>
            {last ? 'Start Exploring' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
