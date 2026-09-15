import type { Recommendation } from '../../services/recommendationService'
import { galaxyNavigation } from '../../utils/navigation'
import { RelationshipNode } from '../relationships/RelationshipNode'
import { eyebrow } from '../ui/panel'

interface RecommendationPanelProps {
  recommendations: Recommendation[]
  fromUniverseId: string | null
}

/**
 * "You may also explore": a few next destinations scored from the current
 * focus and this session's exploration, each with the reason it appeared.
 * Suggestions assist the journey; they never replace the scene.
 */
export function RecommendationPanel({ recommendations, fromUniverseId }: RecommendationPanelProps) {
  if (!recommendations.length) {
    return (
      <section aria-label="You may also explore" className="mt-5">
        <p className={`${eyebrow} pb-1.5`}>You may also explore</p>
        <p className="font-sans text-[12px] leading-5 text-space-300/70">We haven't discovered a connection yet.</p>
      </section>
    )
  }
  return (
    <section aria-label="You may also explore" className="mt-5">
      <p className={`${eyebrow} pb-1.5`}>You may also explore</p>
      <ul>
        {recommendations.map((r) => (
          <RelationshipNode
            key={r.website.id}
            website={r.website}
            caption={r.reasons[0] ?? 'Worth a detour'}
            fromUniverseId={fromUniverseId}
            onSelect={galaxyNavigation.followRelationship}
          />
        ))}
      </ul>
    </section>
  )
}
