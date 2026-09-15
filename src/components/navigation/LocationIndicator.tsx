import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'
import { galaxyNavigation } from '../../utils/navigation'

const segment = 'pointer-events-auto rounded-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60'
const current = 'text-white/90'
const glow = { textShadow: '0 0 12px rgba(190,205,255,0.35)' }

/**
 * Where the camera is: THE WEBGALAXY / AI / CHATGPT. Earlier segments are
 * links back. Purely a spatial location aid — it says nothing about
 * category hierarchy in the data.
 */
export function LocationIndicator() {
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const introDone = useGalaxyStore((s) => s.introPhase === 'complete')
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const universe = universes.find((u) => u.id === activeUniverseId)
  const website = websites.find((w) => w.id === selectedWebsiteId)
  const visible = introDone

  return (
    <nav
      aria-label="Location"
      className={[
        'pointer-events-none absolute top-14 left-5 z-20 flex items-center gap-2.5 sm:top-16 sm:left-9',
        'font-sans text-[11px] tracking-[0.2em] uppercase',
        'transition-opacity duration-700 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {viewMode === 'galaxy' ? (
        <span className={current} style={glow}>The WebGalaxy</span>
      ) : (
        <button type="button" onClick={galaxyNavigation.returnToGalaxy} className={`${segment} text-space-300/80 hover:text-white`}>
          The WebGalaxy
        </button>
      )}
      {universe && (
        <>
          <span aria-hidden className="text-space-300/40">/</span>
          {website ? (
            <button type="button" onClick={galaxyNavigation.returnToUniverse} className={`${segment} text-space-300/80 hover:text-white`}>
              {universe.name}
            </button>
          ) : (
            <span className={current} style={glow}>{universe.name}</span>
          )}
        </>
      )}
      {website && (
        <>
          <span aria-hidden className="text-space-300/40">/</span>
          <span className={current} style={glow}>{website.name}</span>
        </>
      )}
    </nav>
  )
}
