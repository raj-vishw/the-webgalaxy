import { getCatalog } from '../store/catalogStore'
import { useGalaxyStore } from '../store/galaxyStore'
import { interactionEvents } from './interaction'

/**
 * Reusable camera-targeting API. Every entry point — 3D clicks, search,
 * filters, minimap, navigator, discovery, keyboard — goes through these so
 * they all produce the same store state and the same camera journey.
 */
export const galaxyNavigation = {
  focusUniverse(universeId: string) {
    if (!getCatalog().universes.some((u) => u.id === universeId)) return false
    useGalaxyStore.getState().enterUniverse(universeId)
    return true
  },
  focusWebsite(websiteId: string) {
    const website = getCatalog().websites.find((w) => w.id === websiteId)
    if (!website) return false
    useGalaxyStore.getState().selectWebsite(website.id, website.universeId)
    return true
  },
  returnToGalaxy() {
    useGalaxyStore.getState().leaveUniverse()
  },
  returnToUniverse() {
    useGalaxyStore.getState().clearWebsite()
  },
  /**
   * Travel along a connection or a suggestion to another website. The same
   * flight as any other focus — through the destination's universe when it
   * lies elsewhere — but recorded as a step on the explorer's path.
   */
  followRelationship(websiteId: string) {
    const fromId = useGalaxyStore.getState().selectedWebsiteId
    const ok = galaxyNavigation.focusWebsite(websiteId)
    if (ok) interactionEvents.emit({ type: 'relationship:follow', fromId, toId: websiteId })
    return ok
  },
}

/**
 * Route-shaped description of the current location, for a future router.
 * Nothing consumes it yet beyond the document title; universes are not pages.
 */
export function locationPath(): string {
  const { viewMode, activeUniverseId, selectedWebsiteId } = useGalaxyStore.getState()
  if (viewMode === 'website' && selectedWebsiteId) return `/website/${selectedWebsiteId}`
  if (viewMode === 'universe' && activeUniverseId) return `/universe/${activeUniverseId}`
  return '/'
}

export function parseLocationPath(path: string): { universeId?: string; websiteId?: string } {
  const universe = path.match(/^\/universe\/([\w-]+)/)
  if (universe) return { universeId: universe[1] }
  const website = path.match(/^\/website\/([\w-]+)/)
  if (website) return { websiteId: website[1] }
  return {}
}

export function locationTitle(): string {
  const { viewMode, activeUniverseId, selectedWebsiteId } = useGalaxyStore.getState()
  const { universes, websites } = getCatalog()
  const universe = universes.find((u) => u.id === activeUniverseId)
  const website = websites.find((w) => w.id === selectedWebsiteId)
  if (viewMode === 'website' && website) return `${website.name} · The WebGalaxy`
  if (viewMode === 'universe' && universe) return `${universe.name} · The WebGalaxy`
  return 'The WebGalaxy'
}
