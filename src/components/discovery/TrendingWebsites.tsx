import { useUniverses } from '../../store/catalogStore'
import { getTrend, getTrendingWebsites } from '../../services/recommendationService'
import { accentFor } from '../../utils/celestial'
import { galaxyNavigation } from '../../utils/navigation'
import { CelestialIcon } from '../search/CelestialIcon'
import { eyebrow, focusRing } from '../ui/panel'

interface TrendingWebsitesProps {
  limit?: number
  onChoose?: () => void
}

const DIRECTION = { up: '↑', steady: '→', down: '↓' } as const

/** Static demo "trending" list. Marked as a snapshot — it is not live traffic. */
export function TrendingWebsites({ limit = 4, onChoose }: TrendingWebsitesProps) {
  const universes = useUniverses()
  const items = getTrendingWebsites(limit)
  return (
    <section aria-label="Trending websites">
      <p className={`${eyebrow} pb-1`}>🔥 Trending <span className="normal-case tracking-normal text-space-300/45">· demo snapshot</span></p>
      <ul>
        {items.map((w) => {
          const universe = universes.find((u) => u.id === w.universeId)
          const trend = getTrend(w.id)
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => {
                  onChoose?.()
                  galaxyNavigation.focusWebsite(w.id)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.04] ${focusRing}`}
              >
                <CelestialIcon type={w.objectType} accent={accentFor(w)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[13px] text-white">{w.name}</span>
                  <span className="block truncate font-sans text-[10.5px] tracking-[0.08em] text-space-300/70">{universe?.name}</span>
                </span>
                {trend && (
                  <span aria-label={`trend ${trend.trendDirection}`} className="font-sans text-[11px] text-space-300/60">
                    {DIRECTION[trend.trendDirection]}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
