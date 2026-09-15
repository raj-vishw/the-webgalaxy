import { useEffect, useState } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { ViewMode } from '../../types/galaxy'

const HINTS: Record<Exclude<ViewMode, 'website'>, string[]> = {
  galaxy: ['Drag to explore', 'Scroll to travel', 'Click a universe to enter'],
  universe: ['Explore websites', 'Hover to inspect', 'Click to focus'],
}

const TOUCH: Array<[string, string]> = [
  ['Scroll', 'Pinch'],
  ['Hover to inspect', 'Tap to inspect'],
  ['Click', 'Tap'],
]

/**
 * Contextual control hints, bottom-right. They appear when the exploration
 * level changes and step aside as soon as the user is active. The website
 * view carries its own controls in the info panel.
 */
export function InteractionHints() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const [dismissedMode, setDismissedMode] = useState<ViewMode | null>(null)
  const visible = introPhase === 'complete' && viewMode !== 'website' && dismissedMode !== viewMode

  useEffect(() => {
    if (introPhase !== 'complete' || viewMode === 'website') return
    const dismiss = () => setDismissedMode(viewMode)
    const timer = window.setTimeout(dismiss, 8000)
    // Let the click that changed the mode finish before listening.
    const attach = window.setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true })
      window.addEventListener('wheel', dismiss, { once: true })
      window.addEventListener('keydown', dismiss, { once: true })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(attach)
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('wheel', dismiss)
      window.removeEventListener('keydown', dismiss)
    }
  }, [introPhase, viewMode])

  const lines = (viewMode === 'website' ? HINTS.universe : HINTS[viewMode]).map((line) =>
    coarse ? TOUCH.reduce((acc, [from, to]) => acc.replace(from, to), line) : line,
  )

  return (
    <div
      aria-hidden={!visible}
      className={[
        'pointer-events-none absolute right-6 bottom-6 z-10 text-right sm:right-9 sm:bottom-8',
        'font-sans text-[11px] leading-5 tracking-[0.18em] uppercase text-space-300/65',
        'transition-opacity duration-[1200ms]',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
