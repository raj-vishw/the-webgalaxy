import { websites } from '../../data/websites'
import { useGalaxyStore } from '../../store/galaxyStore'
import { applyFilters, hasActiveFilters } from '../../utils/filtering'
import { eyebrow, focusRing, ghostButton, glassPanel } from '../ui/panel'
import { ImportanceFilter } from './ImportanceFilter'
import { ObjectTypeFilter } from './ObjectTypeFilter'
import { UniverseFilter } from './UniverseFilter'

/**
 * Compact floating filter instrument. Filters combine (AND); the scene
 * responds by letting non-matching websites recede rather than vanish.
 */
export function FilterPanel() {
  const open = useGalaxyStore((s) => s.overlay === 'filters')
  const filters = useGalaxyStore((s) => s.filters)
  const clearFilters = useGalaxyStore((s) => s.clearFilters)
  const closeOverlay = useGalaxyStore((s) => s.closeOverlay)
  const active = hasActiveFilters(filters)
  const count = active ? applyFilters(websites, filters).length : websites.length

  return (
    <section
      role="dialog"
      aria-label="Filter the WebGalaxy"
      aria-hidden={!open}
      className={[
        glassPanel,
        'absolute z-30 w-[calc(100%-1.5rem)] max-w-[300px] px-5 pt-4 pb-5',
        'inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:top-16 sm:right-9',
        'transition-[opacity,transform] duration-300 ease-out',
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2 sm:-translate-y-1',
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className={eyebrow}>Filter</p>
        <button
          type="button"
          onClick={closeOverlay}
          aria-label="Close filters"
          className={`flex h-7 w-7 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white ${focusRing}`}
        >
          <span aria-hidden className="text-[15px] leading-none">×</span>
        </button>
      </div>
      <div className="grid gap-3">
        <UniverseFilter />
        <ObjectTypeFilter />
        <ImportanceFilter />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-sans text-[11px] tracking-[0.12em] text-space-300/70" aria-live="polite">
          {count} {count === 1 ? 'website' : 'websites'}
        </p>
        <button type="button" onClick={clearFilters} disabled={!active} className={ghostButton}>
          Clear Filters
        </button>
      </div>
    </section>
  )
}
