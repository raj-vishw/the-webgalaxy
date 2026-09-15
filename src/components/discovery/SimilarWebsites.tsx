import type { Recommendation } from '../../services/recommendationService'
import type { WebsiteDefinition } from '../../types/galaxy'
import { HighlightList } from './HighlightList'

interface Props {
  source: WebsiteDefinition
  items: Recommendation[]
}

/** "similar" highlight set for the focused website. */
export function SimilarWebsites({ source, items }: Props) {
  return <HighlightList kind="similar" source={source} items={items} />
}
