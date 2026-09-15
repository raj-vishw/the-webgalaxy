import { useGalaxyStore } from '../../store/galaxyStore'
import { DISCOVERY_FILTERS, type DiscoveryFilter as Kind } from '../../utils/filtering'
import { FilterSelect } from './FilterSelect'

const OPTIONS = (Object.keys(DISCOVERY_FILTERS) as Kind[]).map((value) => ({ value, label: DISCOVERY_FILTERS[value] }))

/**
 * Discovery-layer filter: trending / emerging (static snapshot) or the
 * focused website's related / alternative websites. Combines with the other
 * filters like any of them.
 */
export function DiscoveryFilter() {
  const value = useGalaxyStore((s) => s.filters.discovery)
  const setFilters = useGalaxyStore((s) => s.setFilters)
  const hasWebsite = useGalaxyStore((s) => s.selectedWebsiteId !== null)
  const label = hasWebsite ? 'Discovery · relative to focus' : 'Discovery'
  return <FilterSelect label={label} value={value} options={OPTIONS} onChange={(discovery) => setFilters({ discovery })} />
}
