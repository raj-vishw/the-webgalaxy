import { useGalaxyStore } from '../../store/galaxyStore'
import type { CelestialObjectType } from '../../types/galaxy'
import { FilterSelect } from './FilterSelect'

const OPTIONS: { value: CelestialObjectType; label: string }[] = [
  { value: 'star', label: 'Stars' },
  { value: 'planet', label: 'Planets' },
  { value: 'moon', label: 'Moons' },
  { value: 'comet', label: 'Comets' },
]

export function ObjectTypeFilter() {
  const value = useGalaxyStore((s) => s.filters.objectType)
  const setFilters = useGalaxyStore((s) => s.setFilters)
  return <FilterSelect label="Object" value={value} options={OPTIONS} onChange={(objectType) => setFilters({ objectType })} />
}
