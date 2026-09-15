import { useCatalogStore } from '../store/catalogStore'

/** Universes plus the catalogue's load state, for components that show it. */
export function useUniverses() {
  const universes = useCatalogStore((s) => s.universes)
  const status = useCatalogStore((s) => s.status)
  const source = useCatalogStore((s) => s.source)
  return { universes, status, source, loading: status === 'loading' }
}
