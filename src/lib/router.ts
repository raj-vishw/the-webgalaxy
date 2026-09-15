import { useCatalogStore } from '../store/catalogStore'
import { useGalaxyStore } from '../store/galaxyStore'
import { galaxyNavigation, locationPath, parseLocationPath } from '../utils/navigation'

/**
 * Shareable locations without pages: `/website/github` and `/universe/ai`
 * deep-link into the galaxy, the address bar follows the explorer, and the
 * browser's back button steps through the journey. Everything stays one
 * continuous scene.
 */
let applying = false

/** Navigate to whatever the current path names (after the catalogue is in). */
export function applyLocation(path = window.location.pathname): boolean {
  const target = parseLocationPath(path)
  const { websites, universes } = useCatalogStore.getState()
  applying = true
  try {
    if (target.websiteId && websites.some((w) => w.id === target.websiteId)) return galaxyNavigation.focusWebsite(target.websiteId)
    if (target.universeId && universes.some((u) => u.id === target.universeId)) return galaxyNavigation.focusUniverse(target.universeId)
    if (!target.websiteId && !target.universeId) {
      if (useGalaxyStore.getState().viewMode !== 'galaxy') galaxyNavigation.returnToGalaxy()
      return true
    }
    return false
  } finally {
    applying = false
  }
}

/** Keeps the address bar in step with the store and answers back/forward. */
export function startRouter(): () => void {
  const sync = () => {
    if (applying) return
    const path = locationPath()
    if (path === window.location.pathname) return
    window.history.pushState(null, '', `${path}${window.location.search}${window.location.hash}`)
  }
  const unsubscribe = useGalaxyStore.subscribe((state, previous) => {
    if (state.introPhase !== 'complete') return
    if (state.viewMode !== previous.viewMode || state.activeUniverseId !== previous.activeUniverseId || state.selectedWebsiteId !== previous.selectedWebsiteId) sync()
  })
  const onPop = () => {
    if (useGalaxyStore.getState().introPhase === 'complete') applyLocation()
  }
  window.addEventListener('popstate', onPop)
  return () => {
    unsubscribe()
    window.removeEventListener('popstate', onPop)
  }
}

/** The canonical share URL for the current location. */
export function shareUrl(): string {
  return `${window.location.origin}${locationPath()}`
}
