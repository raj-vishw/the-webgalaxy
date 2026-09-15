import { useEffect, useState } from 'react'
import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { DISCOVERY_MODE_LABEL, discoveryPool, pickDiscoveryTarget } from '../../services/discoveryService'
import { useGalaxyStore } from '../../store/galaxyStore'
import { scanSequence } from '../../utils/discovery'
import { galaxyNavigation } from '../../utils/navigation'

const FOUND_HOLD_MS = 1100
const EMPTY_HOLD_MS = 1600

function nameOf(kind: 'website' | 'universe', id: string | null): string {
  if (!id) return ''
  return kind === 'website' ? (websites.find((w) => w.id === id)?.name ?? '') : (universes.find((u) => u.id === id)?.name ?? '')
}

/**
 * "The galaxy is searching itself": candidates flash by, slow down and stop
 * on the destination; then the camera travels there. Every discovery mode
 * shares this — only the pool and the pick differ. With reduced motion the
 * scan is skipped and the destination is simply announced.
 */
export function DiscoveryAnimation() {
  const discovery = useGalaxyStore((s) => s.discovery)
  const { phase, mode, targetId, candidateId, reason } = discovery
  const setDiscovery = useGalaxyStore((s) => s.setDiscovery)
  const endDiscovery = useGalaxyStore((s) => s.endDiscovery)
  const isTransitioning = useGalaxyStore((s) => s.isTransitioning)
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const kind = mode === 'universe' ? 'universe' : 'website'

  // Scanning → found (or → nothing to find).
  useEffect(() => {
    if (phase !== 'scanning') return
    const { recommendationContext } = useGalaxyStore.getState()
    const target = pickDiscoveryTarget(mode, recommendationContext)
    if (!target) {
      setDiscovery({ phase: 'found', candidateId: null, targetId: null, reason: null })
      return
    }
    const pool = discoveryPool(mode, recommendationContext)
    // Ranked modes have small pools; borrow the wider random pool for the scan.
    const scanPool = pool.length >= 6 ? pool : discoveryPool('random', recommendationContext)
    const sequence = reduced ? [{ id: target.id, delay: 0 }] : scanSequence(scanPool, target.id)
    const timers: number[] = []
    let elapsed = 0
    for (const step of sequence) {
      timers.push(window.setTimeout(() => setDiscovery({ candidateId: step.id }), elapsed))
      elapsed += step.delay
    }
    timers.push(
      window.setTimeout(
        () => setDiscovery({ phase: 'found', candidateId: target.id, targetId: target.id, reason: target.reason }),
        elapsed + 120,
      ),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phase, mode, reduced, setDiscovery])

  // Found → travel (or → idle when there was nothing to find).
  useEffect(() => {
    if (phase !== 'found') return
    if (!targetId) {
      const timer = window.setTimeout(endDiscovery, EMPTY_HOLD_MS)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(
      () => {
        setDiscovery({ phase: 'travelling' })
        if (kind === 'website') galaxyNavigation.followRelationship(targetId)
        else galaxyNavigation.focusUniverse(targetId)
      },
      reduced ? 400 : FOUND_HOLD_MS,
    )
    return () => window.clearTimeout(timer)
  }, [phase, kind, targetId, reduced, setDiscovery, endDiscovery])

  // Travel → idle once the camera has arrived.
  useEffect(() => {
    if (phase !== 'travelling' || isTransitioning) return
    const timer = window.setTimeout(endDiscovery, 250)
    return () => window.clearTimeout(timer)
  }, [phase, isTransitioning, endDiscovery])

  const visible = phase === 'scanning' || phase === 'found'
  const empty = phase === 'found' && !targetId
  const name = nameOf(kind, phase === 'found' ? targetId : candidateId)
  const eyebrowText = empty
    ? `No ${DISCOVERY_MODE_LABEL[mode].toLowerCase()} websites charted here`
    : phase === 'found'
      ? 'Destination found'
      : `Scanning the WebGalaxy · ${DISCOVERY_MODE_LABEL[mode]}`

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
      <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-space-300/75">{eyebrowText}</p>
      <p
        className={[
          'mt-4 font-sans font-light uppercase text-white',
          'text-[clamp(1.4rem,4vw,2.6rem)] tracking-[0.28em]',
          'transition-[letter-spacing,opacity] duration-300',
          phase === 'found' ? 'opacity-100 tracking-[0.34em]' : 'opacity-80',
        ].join(' ')}
        style={{ textShadow: '0 0 26px rgba(200,214,255,0.4)' }}
      >
        {empty ? '—' : name || '·'}
      </p>
      <p className={`mt-3 h-4 font-sans text-[11px] tracking-[0.18em] text-space-300/70 transition-opacity duration-300 ${phase === 'found' && reason ? 'opacity-100' : 'opacity-0'}`}>
        {reason ?? ''}
      </p>
      <span
        aria-hidden
        className={[
          'mt-4 block h-px w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent',
          phase === 'scanning' && !reduced ? 'animate-pulse' : '',
        ].join(' ')}
      />
    </div>
  )
}
