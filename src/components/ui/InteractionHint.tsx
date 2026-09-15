import { useEffect, useState } from 'react'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { ExplorationMode } from '../../types/galaxy'

const HINTS: Record<ExplorationMode, [string, string]> = {
  galaxy: ['Drag to explore', 'Scroll to travel · Click a universe'],
  universe: ['Hover a world to identify it', 'Click to focus · Esc to go back'],
  website: ['Drag to look around', 'Esc to release'],
}

/**
 * Two-line control hint, bottom-right. Shown briefly whenever the exploration
 * level changes and dismissed by the first interaction.
 */
export function InteractionHint() {
  const introPhase = useGalaxyStore((s) => s.introPhase)
  const mode = useGalaxyStore((s) => s.explorationMode)
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  // The hint for a mode stays until the user interacts (or 8 s pass); a mode
  // change brings it back with the new lines.
  const [dismissedMode, setDismissedMode] = useState<ExplorationMode | null>(null)
  const visible = introPhase === 'complete' && dismissedMode !== mode

  useEffect(() => {
    if (introPhase !== 'complete') return
    const dismiss = () => setDismissedMode(mode)
    const timer = window.setTimeout(dismiss, 8000)
    // Let the click that changed the mode finish before listening.
    const attach = window.setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true })
      window.addEventListener('wheel', dismiss, { once: true })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(attach)
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('wheel', dismiss)
    }
  }, [introPhase, mode])

  const touch = (line: string) =>
    line.replace('Scroll', 'Pinch').replace('Hover', 'Tap').replace('Esc to', 'Tap away to').replace('Click', 'Tap')
  const [line1, line2] = HINTS[mode].map((line) => (coarse ? touch(line) : line))

  return (
    <div
      className={[
        'pointer-events-none absolute right-6 bottom-6 z-10 text-right sm:right-9 sm:bottom-8',
        'font-sans text-[11px] leading-5 tracking-[0.18em] uppercase text-space-300/65',
        'transition-opacity duration-[1200ms]',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <p>{line1}</p>
      <p>{line2}</p>
    </div>
  )
}
