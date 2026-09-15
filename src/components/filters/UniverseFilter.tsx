import { useUniverses } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { FilterSelect } from './FilterSelect'

export function UniverseFilter() {
  const value = useGalaxyStore((s) => s.filters.universeId)
  const setFilters = useGalaxyStore((s) => s.setFilters)
  const universes = useUniverses()
  return (
    <FilterSelect
      label="Universe"
      value={value}
      options={universes.map((u) => ({ value: u.id, label: u.name }))}
      onChange={(universeId) => setFilters({ universeId })}
    />
  )
}
