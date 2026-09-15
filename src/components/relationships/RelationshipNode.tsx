import { universes } from '../../data/universes'
import type { WebsiteDefinition } from '../../types/galaxy'
import { accentFor } from '../../utils/celestial'
import { CelestialIcon } from '../search/CelestialIcon'
import { focusRing } from '../ui/panel'

interface RelationshipNodeProps {
  website: WebsiteDefinition
  /** Small caption: relationship type, reason, or explanation. */
  caption: string
  /** Universe of the website the list is about; other universes are named. */
  fromUniverseId?: string | null
  /** For directed relationships only: which way the connection runs. */
  arrow?: 'out' | 'in'
  onSelect: (websiteId: string) => void
}

/**
 * One connected website in a list. Clicking it is the same journey as
 * clicking the object in space. The caption describes the connection —
 * never a rank.
 */
export function RelationshipNode({ website, caption, fromUniverseId, arrow, onSelect }: RelationshipNodeProps) {
  const universe = universes.find((u) => u.id === website.universeId)
  const elsewhere = fromUniverseId && website.universeId !== fromUniverseId ? universe?.name : null
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(website.id)}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.05] ${focusRing}`}
      >
        <CelestialIcon type={website.objectType} accent={accentFor(website)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-[13px] text-white">{website.name}</span>
          <span className="block truncate font-sans text-[10.5px] tracking-[0.06em] text-space-300/70">
            {arrow === 'out' ? '→ ' : arrow === 'in' ? '← ' : ''}
            {caption}
            {elsewhere ? <span className="text-space-300/50"> · {elsewhere} Universe</span> : null}
          </span>
        </span>
        <span aria-hidden className="font-sans text-[11px] text-space-300/45 opacity-0 transition-opacity group-hover:opacity-100">
          ↗
        </span>
      </button>
    </li>
  )
}
