import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { galaxyNavigation } from '../../utils/navigation'
import { ExplorationHistory } from '../history/ExplorationHistory'
import { eyebrow, focusRing, glassPanel } from '../ui/panel'

/**
 * Compact list of universes — a shortcut into the same cinematic travel a
 * click on the 3D structure triggers. Never the primary navigation.
 */
export function UniverseNavigator() {
  const open = useGalaxyStore((s) => s.overlay === 'navigator')
  const activeUniverseId = useGalaxyStore((s) => s.activeUniverseId)
  const closeOverlay = useGalaxyStore((s) => s.closeOverlay)
  const universes = useCatalogStore((s) => s.universes)
  const websites = useCatalogStore((s) => s.websites)

  return (
    <nav
      aria-label="Universes"
      aria-hidden={!open}
      className={[
        glassPanel,
        'absolute top-16 left-9 z-30 w-[252px] px-2 pt-3 pb-2',
        'max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain',
        'max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-20 max-sm:max-h-[62vh] max-sm:w-auto',
        'transition-[opacity,transform] duration-300 ease-out',
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
      ].join(' ')}
    >
      <p className={`${eyebrow} px-3 pb-2`}>Explore</p>
      <ul className="max-sm:grid max-sm:grid-cols-2">
        {universes.map((u) => {
          const active = u.id === activeUniverseId
          return (
            <li key={u.id}>
              <button
                type="button"
                aria-current={active ? 'location' : undefined}
                onClick={() => {
                  closeOverlay()
                  galaxyNavigation.focusUniverse(u.id)
                }}
                className={[
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-white/[0.05]',
                  focusRing,
                ].join(' ')}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: u.palette.primary, boxShadow: `0 0 8px ${u.palette.primary}` }} />
                <span className={`flex-1 font-sans text-[13px] ${active ? 'text-white' : 'text-white/80'}`}>{u.name}</span>
                <span className="font-sans text-[10px] tracking-[0.1em] text-space-300/55">{u.websiteCount ?? websites.filter((w) => w.universeId === u.id).length}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <ExplorationHistory />
    </nav>
  )
}
