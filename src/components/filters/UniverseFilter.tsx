import { universes } from '../../data/universes'
import { useGalaxyStore } from '../../store/galaxyStore'
import { FilterSelect } from './FilterSelect'

export function UniverseFilter() {
  const value = useGalaxyStore((s) => s.filters.universeId)
  const setFilters = useGalaxyStore((s) => s.setFilters)
  return (
    <FilterSelect
      label="Universe"
      value={value}
      options={universes.map((u) => ({ value: u.id, label: u.name }))}
      onChange={(universeId) => setFilters({ universeId })}
    />
  )
}
