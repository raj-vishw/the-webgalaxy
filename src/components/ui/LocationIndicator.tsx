import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'

const segmentClass =
  'pointer-events-auto rounded-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60'

/**
 * Tiny breadcrumb of where the camera is: WEBGALAXY / AI / CHATGPT. Purely a
 * spatial location aid — it says nothing about category hierarchy.
 */
export function LocationIndicator() {
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const leaveUniverse = useGalaxyStore((s) => s.leaveUniverse)
  const clearWebsite = useGalaxyStore((s) => s.clearWebsite)
  const universe = universes.find((u) => u.id === activeUniverseId)
  const website = websites.find((w) => w.id === selectedWebsiteId)
  const visible = viewMode !== 'galaxy' && !!universe

  return (
    <nav
      aria-label="Location"
      className={[
        'pointer-events-none absolute top-14 left-5 z-20 flex items-center gap-2.5 sm:top-16 sm:left-9',
        'font-sans text-[11px] tracking-[0.2em] uppercase',
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <button type="button" onClick={leaveUniverse} disabled={!visible} className={`${segmentClass} text-space-300/80 hover:text-white`}>
        WebGalaxy
      </button>
      <span aria-hidden className="text-space-300/40">/</span>
      {website ? (
        <>
          <button type="button" onClick={clearWebsite} disabled={!visible} className={`${segmentClass} text-space-300/80 hover:text-white`}>
            {universe?.name}
          </button>
          <span aria-hidden className="text-space-300/40">/</span>
          <span className="text-white/90" style={{ textShadow: '0 0 12px rgba(190,205,255,0.35)' }}>
            {website.name}
          </span>
        </>
      ) : (
        <span className="text-white/90" style={{ textShadow: '0 0 12px rgba(190,205,255,0.35)' }}>
          {universe?.name}
        </span>
      )}
    </nav>
  )
}
