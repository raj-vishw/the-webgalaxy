import type { Recommendation } from '../../services/recommendationService'
import type { WebsiteDefinition } from '../../types/galaxy'
import { HighlightList } from './HighlightList'

interface Props {
  source: WebsiteDefinition
  items: Recommendation[]
}

/** "alternative" highlight set for the focused website. */
export function AlternativeWebsites({ source, items }: Props) {
  return <HighlightList kind="alternative" source={source} items={items} />
}
