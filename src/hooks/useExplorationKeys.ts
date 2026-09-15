import { useEffect } from 'react'
import { useGalaxyStore } from '../store/galaxyStore'

/** Escape steps back one exploration level: website → universe → galaxy. */
export function useExplorationKeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useGalaxyStore.getState().goBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
