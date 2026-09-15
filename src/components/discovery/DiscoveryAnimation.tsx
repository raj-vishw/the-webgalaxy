import { useEffect, useState } from 'react'
import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'
import { isDiscoverable, pickRandomUniverse, pickRandomWebsite, scanSequence } from '../../utils/discovery'
import { galaxyNavigation } from '../../utils/navigation'

const FOUND_HOLD_MS = 1100

function nameOf(mode: 'website' | 'universe', id: string | null): string {
  if (!id) return ''
  return mode === 'website' ? (websites.find((w) => w.id === id)?.name ?? '') : (universes.find((u) => u.id === id)?.name ?? '')
}

/**
 * "The galaxy is searching itself": candidates flash by, slow down and stop
 * on the destination; then the camera travels there. With reduced motion the
 * scan is skipped and the destination is simply announced.
 */
export function DiscoveryAnimation() {
  const discovery = useGalaxyStore((s) => s.discovery)
  const { phase, mode, targetId, candidateId } = discovery
  const setDiscovery = useGalaxyStore((s) => s.setDiscovery)
  const endDiscovery = useGalaxyStore((s) => s.endDiscovery)
  const isTransitioning = useGalaxyStore((s) => s.isTransitioning)
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  // Scanning → found.
  useEffect(() => {
    if (phase !== 'scanning') return
    const { activeUniverseId, selectedWebsiteId } = useGalaxyStore.getState()
    const target =
      mode === 'website'
        ? pickRandomWebsite(websites, selectedWebsiteId ?? undefined)?.id
        : pickRandomUniverse(universes, activeUniverseId ?? undefined)?.id
    if (!target) {
      endDiscovery()
      return
    }
    const pool = mode === 'website' ? websites.filter(isDiscoverable).map((w) => w.id) : universes.map((u) => u.id)
    const sequence = reduced ? [{ id: target, delay: 0 }] : scanSequence(pool, target)
    const timers: number[] = []
    let elapsed = 0
    for (const step of sequence) {
      timers.push(window.setTimeout(() => setDiscovery({ candidateId: step.id }), elapsed))
      elapsed += step.delay
    }
    timers.push(window.setTimeout(() => setDiscovery({ phase: 'found', candidateId: target, targetId: target }), elapsed + 120))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phase, mode, reduced, setDiscovery, endDiscovery])

  // Found → travel.
  useEffect(() => {
    if (phase !== 'found' || !targetId) return
    const timer = window.setTimeout(
      () => {
        setDiscovery({ phase: 'travelling' })
        if (mode === 'website') galaxyNavigation.focusWebsite(targetId)
        else galaxyNavigation.focusUniverse(targetId)
      },
      reduced ? 400 : FOUND_HOLD_MS,
    )
    return () => window.clearTimeout(timer)
  }, [phase, mode, targetId, reduced, setDiscovery])

  // Travel → idle once the camera has arrived.
  useEffect(() => {
    if (phase !== 'travelling' || isTransitioning) return
    const timer = window.setTimeout(endDiscovery, 250)
    return () => window.clearTimeout(timer)
  }, [phase, isTransitioning, endDiscovery])

  const visible = phase === 'scanning' || phase === 'found'
  const name = nameOf(mode, phase === 'found' ? targetId : candidateId)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={[
        'pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center text-center',
        'transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-space-300/75">
        {phase === 'found' ? 'Destination found' : 'Scanning the WebGalaxy'}
      </p>
      <p
        className={[
          'mt-4 font-sans font-light uppercase text-white',
          'text-[clamp(1.4rem,4vw,2.6rem)] tracking-[0.28em]',
          'transition-[letter-spacing,opacity] duration-300',
          phase === 'found' ? 'opacity-100 tracking-[0.34em]' : 'opacity-80',
        ].join(' ')}
        style={{ textShadow: '0 0 26px rgba(200,214,255,0.4)' }}
      >
        {name || '·'}
      </p>
      <span
        aria-hidden
        className={[
          'mt-6 block h-px w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent',
          phase === 'scanning' && !reduced ? 'animate-pulse' : '',
        ].join(' ')}
      />
    </div>
  )
}
