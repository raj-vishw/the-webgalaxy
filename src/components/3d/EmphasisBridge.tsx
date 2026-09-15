import { useEffect } from 'react'
import { universes } from '../../data/universes'
import { websites } from '../../data/websites'
import { sceneMotion } from '../../lib/sceneMotion'
import { useGalaxyStore } from '../../store/galaxyStore'
import { applyFilters, hasActiveFilters } from '../../utils/filtering'
import { searchGalaxy } from '../../utils/search'

/**
 * Translates search, filter, discovery and travel state into the per-frame
 * emphasis/filter sets the scene reads. Runs as store subscriptions, so
 * typing a query never re-renders a single 3D component.
 */
export function EmphasisBridge() {
  useEffect(() => {
    let debounce = 0

    const apply = () => {
      const { overlay, searchQuery, filters, discovery, isTransitioning, viewMode, selectedWebsiteId } =
        useGalaxyStore.getState()
      const emphasis = sceneMotion.emphasis
      const websiteIds = new Set<string>()
      const universeIds = new Set<string>()
      let active = false
      let dimOthers = 0

      if (discovery.phase !== 'idle') {
        // The galaxy "searching itself": the current candidate lights up.
        const id = discovery.phase === 'scanning' ? discovery.candidateId : discovery.targetId
        if (id) {
          if (discovery.mode === 'website') {
            websiteIds.add(id)
            const site = websites.find((w) => w.id === id)
            if (site) universeIds.add(site.universeId)
          } else {
            universeIds.add(id)
          }
        }
        active = true
        dimOthers = 0.55
      } else if (isTransitioning && viewMode === 'website' && selectedWebsiteId) {
        // Travelling to a result: the destination stays lit the whole way.
        websiteIds.add(selectedWebsiteId)
        const site = websites.find((w) => w.id === selectedWebsiteId)
        if (site) universeIds.add(site.universeId)
        active = true
        dimOthers = 0.4
      } else if (overlay === 'search' && searchQuery.trim()) {
        const results = searchGalaxy(searchQuery, websites, universes, filters)
        for (const match of results.websites) {
          websiteIds.add(match.website.id)
          universeIds.add(match.website.universeId)
        }
        for (const match of results.universes) universeIds.add(match.universe.id)
        active = true
        dimOthers = 0.35
      }

      emphasis.websiteIds = websiteIds
      emphasis.universeIds = universeIds
      emphasis.active = active
      emphasis.dimOthers = dimOthers

      const filterActive = hasActiveFilters(filters)
      sceneMotion.filter.active = filterActive
      sceneMotion.filter.websiteIds = filterActive ? new Set(applyFilters(websites, filters).map((w) => w.id)) : new Set()
    }

    apply()
    const unsubscribe = useGalaxyStore.subscribe((state, previous) => {
      if (state.searchQuery !== previous.searchQuery) {
        // Keystrokes are coalesced; everything else applies immediately.
        window.clearTimeout(debounce)
        debounce = window.setTimeout(apply, 60)
        return
      }
      if (
        state.overlay !== previous.overlay ||
        state.filters !== previous.filters ||
        state.discovery !== previous.discovery ||
        state.isTransitioning !== previous.isTransitioning ||
        state.viewMode !== previous.viewMode ||
        state.selectedWebsiteId !== previous.selectedWebsiteId
      ) {
        apply()
      }
    })
    return () => {
      window.clearTimeout(debounce)
      unsubscribe()
      sceneMotion.emphasis.active = false
      sceneMotion.filter.active = false
    }
  }, [])

  return null
}
