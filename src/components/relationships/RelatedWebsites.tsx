import { useMemo } from 'react'
import { RELATIONSHIP_LABEL, getRelatedWebsites } from '../../services/relationshipService'
import { MAX_VISIBLE_RELATIONSHIPS } from '../../store/galaxyStore'
import type { WebsiteDefinition } from '../../types/galaxy'
import { galaxyNavigation } from '../../utils/navigation'
import { eyebrow } from '../ui/panel'
import { RelationshipLegend } from './RelationshipLegend'
import { RelationshipNode } from './RelationshipNode'

interface RelatedWebsitesProps {
  website: WebsiteDefinition
}

/**
 * The focused website's connections, as text. This is the accessible twin
 * of the lines in the scene: the same set, in the same order, with the type
 * of every connection spelled out.
 */
export function RelatedWebsites({ website }: RelatedWebsitesProps) {
  const related = useMemo(() => getRelatedWebsites(website.id, MAX_VISIBLE_RELATIONSHIPS), [website.id])
  if (!related.length) return null
  const summary = related.map((r) => `${r.website.name} (${RELATIONSHIP_LABEL[r.type].toLowerCase()})`).join(', ')

  return (
    <section aria-label="Related websites" className="mt-5">
      <p className={`${eyebrow} pb-1.5`}>Related</p>
      <p className="sr-only">Related websites: {summary}.</p>
      <ul>
        {related.map((r) => (
          <RelationshipNode
            key={`${r.website.id}:${r.type}`}
            website={r.website}
            caption={r.note ?? RELATIONSHIP_LABEL[r.type]}
            fromUniverseId={website.universeId}
            arrow={r.directed ? (r.outgoing ? 'out' : 'in') : undefined}
            onSelect={galaxyNavigation.followRelationship}
          />
        ))}
      </ul>
      <div className="mt-2">
        <RelationshipLegend types={related.map((r) => r.type)} />
      </div>
    </section>
  )
}
