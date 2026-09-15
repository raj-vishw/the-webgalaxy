import { useMemo } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { accentFor } from '../../utils/celestial'
import { galaxyNavigation } from '../../utils/navigation'
import { CelestialIcon } from '../search/CelestialIcon'
import { eyebrow, focusRing } from '../ui/panel'

interface ExplorationHistoryProps {
  limit?: number
}

/**
 * Recently explored websites this session (tab-local, never uploaded).
 * A memory aid and a way back — the order is the order of travel, nothing
 * else. Clearing it also resets the trail and the session signals.
 */
export function ExplorationHistory({ limit = 5 }: ExplorationHistoryProps) {
  const history = useGalaxyStore((s) => s.explorationHistory)
  const clear = useGalaxyStore((s) => s.clearExplorationHistory)
  const websites = useCatalogStore((s) => s.websites)
  const universes = useCatalogStore((s) => s.universes)
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name: string; universeName: string | undefined; objectType: 'star' | 'planet' | 'moon' | 'comet'; accent: string }[] = []
    for (let i = history.length - 1; i >= 0 && out.length < limit; i--) {
      const entry = history[i]
      if (entry.kind !== 'website' || seen.has(entry.id)) continue
      const website = websites.find((w) => w.id === entry.id)
      if (!website) continue
      seen.add(entry.id)
      out.push({
        id: website.id,
        name: website.name,
        universeName: universes.find((u) => u.id === website.universeId)?.name,
        objectType: website.objectType,
        accent: accentFor(website),
      })
    }
    return out
  }, [history, limit, websites, universes])

  if (!recent.length) return null

  return (
    <section aria-label="Recently explored" className="mt-2 border-t border-white/[0.07] pt-2">
      <div className="flex items-center justify-between gap-3 px-3 pb-1">
        <p className={eyebrow}>Recently explored</p>
        <button
          type="button"
          onClick={clear}
          className={`rounded-sm font-sans text-[10px] tracking-[0.14em] uppercase text-space-300/55 transition-colors hover:text-white ${focusRing}`}
        >
          Clear
        </button>
      </div>
      <ul>
        {recent.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => galaxyNavigation.focusWebsite(item.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/[0.05] ${focusRing}`}
            >
              <CelestialIcon type={item.objectType} accent={item.accent} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[12.5px] text-white/90">{item.name}</span>
                <span className="block truncate font-sans text-[10px] tracking-[0.08em] text-space-300/60">{item.universeName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
