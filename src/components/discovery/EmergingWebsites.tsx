import { useUniverses } from '../../store/catalogStore'
import { getEmergingWebsites } from '../../services/recommendationService'
import { accentFor } from '../../utils/celestial'
import { galaxyNavigation } from '../../utils/navigation'
import { CelestialIcon } from '../search/CelestialIcon'
import { eyebrow, focusRing } from '../ui/panel'

interface EmergingWebsitesProps {
  limit?: number
  onChoose?: () => void
}

/** Lesser-known websites with discovery potential (static demo data). */
export function EmergingWebsites({ limit = 3, onChoose }: EmergingWebsitesProps) {
  const universes = useUniverses()
  const items = getEmergingWebsites(limit)
  return (
    <section aria-label="Emerging websites">
      <p className={`${eyebrow} pb-1`}>✦ Emerging</p>
      <ul>
        {items.map((w) => {
          const universe = universes.find((u) => u.id === w.universeId)
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
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
