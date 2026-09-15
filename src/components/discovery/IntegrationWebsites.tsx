import type { Recommendation } from '../../services/recommendationService'
import type { WebsiteDefinition } from '../../types/galaxy'
import { HighlightList } from './HighlightList'

interface Props {
  source: WebsiteDefinition
  items: Recommendation[]
}

/** "integration" highlight set for the focused website. */
export function IntegrationWebsites({ source, items }: Props) {
  return <HighlightList kind="integration" source={source} items={items} />
}
