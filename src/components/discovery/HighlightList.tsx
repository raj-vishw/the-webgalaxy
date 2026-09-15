import { HIGHLIGHT_LABEL, type HighlightKind } from '../../services/discoveryService'
import type { Recommendation } from '../../services/recommendationService'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { WebsiteDefinition } from '../../types/galaxy'
import { galaxyNavigation } from '../../utils/navigation'
import { RelationshipNode } from '../relationships/RelationshipNode'
import { eyebrow, focusRing } from '../ui/panel'

interface HighlightListProps {
  kind: HighlightKind
  source: WebsiteDefinition
  items: Recommendation[]
}

/**
 * Result set of a highlight action (Explore Similar / Find Alternatives /
 * Works With). The same websites are lit in the scene; choosing one here is
 * the same journey as clicking it there.
 */
export function HighlightList({ kind, source, items }: HighlightListProps) {
  const setHighlight = useGalaxyStore((s) => s.setHighlight)
  const label = HIGHLIGHT_LABEL[kind]
  const names = items.map((i) => i.website.name).join(', ')

  return (
    <section aria-label={`${label.title} ${source.name}`} className="mt-5" aria-live="polite">
      <div className="flex items-center justify-between pb-1.5">
        <p className={eyebrow}>
          {label.title} {source.name}
        </p>
        <button
          type="button"
          onClick={() => setHighlight(null)}
          aria-label="Clear highlighted websites"
          className={`rounded-sm font-sans text-[10px] tracking-[0.16em] uppercase text-space-300/60 transition-colors hover:text-white ${focusRing}`}
        >
          Clear
        </button>
      </div>
      {items.length ? (
        <>
          <p className="sr-only">{label.title} {source.name}: {names}.</p>
          <ul>
            {items.map((item) => (
              <RelationshipNode
                key={item.website.id}
                website={item.website}
                caption={item.reasons[0] ?? label.title}
                fromUniverseId={source.universeId}
                onSelect={galaxyNavigation.followRelationship}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="font-sans text-[12px] leading-5 text-space-300/70">{label.empty}</p>
      )}
    </section>
  )
}
