import { useCatalogStore, useWebsitesInUniverse } from '../store/catalogStore'

/** Websites (optionally of one universe) plus the catalogue's load state. */
export function useWebsites(universeId: string | null = null) {
  const all = useCatalogStore((s) => s.websites)
  const inUniverse = useWebsitesInUniverse(universeId)
  const status = useCatalogStore((s) => s.status)
  const source = useCatalogStore((s) => s.source)
  return { websites: universeId ? inUniverse : all, status, source, loading: status === 'loading' }
}
