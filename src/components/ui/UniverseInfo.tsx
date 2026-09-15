import { useMemo } from 'react'
import { universes } from '../../data/universes'
import { websitesInUniverse } from '../../data/websites'
import { getRecommendedUniverses } from '../../services/recommendationService'
import { useGalaxyStore } from '../../store/galaxyStore'
import { galaxyNavigation } from '../../utils/navigation'

/**
 * Quiet title card for the entered universe: name, one line about it, and
 * how many websites live there. Steps aside while a website is focused.
 */
export function UniverseInfo() {
  const viewMode = useGalaxyStore((s) => s.viewMode)
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const leaveUniverse = useGalaxyStore((s) => s.leaveUniverse)
  const universe = universes.find((u) => u.id === activeUniverseId)
  const count = universe ? websitesInUniverse(universe.id).length : 0
  const discovering = useGalaxyStore((s) => s.discovery.phase !== 'idle')
  const visible = viewMode === 'universe' && !!universe && !discovering
  const context = useGalaxyStore((s) => s.recommendationContext)
  // Universes an explorer of this one often finds useful — peers, not children.
  const related = useMemo(() => (universe ? getRecommendedUniverses({ ...context, currentUniverseId: universe.id }) : []), [universe, context])

  return (
    <aside
      aria-hidden={!visible}
      className={[
        // Text never blocks the scene behind it; only the button is interactive.
        'pointer-events-none absolute top-24 left-5 z-10 max-w-[240px] sm:top-auto sm:bottom-9 sm:left-9 sm:max-w-[260px]',
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={leaveUniverse}
        disabled={!visible}
        className="pointer-events-auto whitespace-nowrap font-sans text-[11px] tracking-[0.2em] uppercase text-space-300/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
      >
        ← Back to WebGalaxy
      </button>
      <h2
        className="mt-3 font-sans text-[22px] font-light tracking-[0.18em] uppercase text-white"
        style={{ textShadow: '0 0 20px rgba(190,205,255,0.35)' }}
      >
        {universe?.name}
      </h2>
      <p className="mt-1 font-sans text-[12px] leading-5 text-space-300">{universe?.description}</p>
      <p className="mt-2 font-sans text-[11px] tracking-[0.18em] uppercase text-space-300/60">
        {count} {count === 1 ? 'website' : 'websites'} discovered
      </p>
      {related.length > 0 && (
        <div className="mt-3">
          <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-space-300/50">Also worth exploring</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {related.map(({ universe: u, reason }) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={!visible}
                  title={reason}
                  onClick={() => galaxyNavigation.focusUniverse(u.id)}
                  className="pointer-events-auto rounded-full border border-white/12 bg-[#070a18]/40 px-2.5 py-0.5 font-sans text-[11px] text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                >
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
