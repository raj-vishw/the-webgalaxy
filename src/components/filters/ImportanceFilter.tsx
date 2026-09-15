import { useGalaxyStore } from '../../store/galaxyStore'
import { IMPORTANCE_BANDS, type ImportanceBand } from '../../utils/filtering'
import { FilterSelect } from './FilterSelect'

const OPTIONS = (Object.keys(IMPORTANCE_BANDS) as ImportanceBand[]).map((value) => ({ value, label: IMPORTANCE_BANDS[value].label }))

export function ImportanceFilter() {
  const value = useGalaxyStore((s) => s.filters.importance)
  const setFilters = useGalaxyStore((s) => s.setFilters)
  return <FilterSelect label="Importance" value={value} options={OPTIONS} onChange={(importance) => setFilters({ importance })} />
}
