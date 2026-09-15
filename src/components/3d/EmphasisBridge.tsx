import { useEffect } from 'react'
import { sceneMotion } from '../../lib/sceneMotion'
import { discoveryFilterContext } from '../../services/discoveryService'
import { useCatalogStore } from '../../store/catalogStore'
import { useGalaxyStore } from '../../store/galaxyStore'
import { applyFilters, hasActiveFilters } from '../../utils/filtering'

/**
 * Translates search, filter, discovery and travel state into the per-frame
 * emphasis/filter sets the scene reads. Runs as store subscriptions, so
 * typing a query never re-renders a single 3D component.
 */
export function EmphasisBridge() {
  useEffect(() => {
    let debounce = 0

    const apply = () => {
      const { overlay, searchQuery, filters, discovery, isTransitioning, viewMode, selectedWebsiteId, highlight, visibleRelationships, searchResults } =
        useGalaxyStore.getState()
      const { websites } = useCatalogStore.getState()
      const emphasis = sceneMotion.emphasis
      const websiteIds = new Set<string>()
      const universeIds = new Set<string>()
      let active = false
      let dimOthers = 0

      if (discovery.phase !== 'idle') {
        // The galaxy "searching itself": the current candidate lights up.
        const id = discovery.phase === 'scanning' ? discovery.candidateId : discovery.targetId
        if (id) {
          if (discovery.mode === 'universe') {
            universeIds.add(id)
          } else {
            websiteIds.add(id)
            const site = websites.find((w) => w.id === id)
            if (site) universeIds.add(site.universeId)
          }
        }
        active = true
        dimOthers = 0.55
      } else if (highlight && highlight.items.length) {
        // Explore Similar / Find Alternatives / Works With: the set lights up
        // around the focused website, which stays lit itself.
        websiteIds.add(highlight.sourceId)
        for (const item of highlight.items) {
          websiteIds.add(item.website.id)
          universeIds.add(item.website.universeId)
        }
        active = true
        dimOthers = 0.45
      } else if (isTransitioning && viewMode === 'website' && selectedWebsiteId) {
        // Travelling to a result: the destination stays lit the whole way.
        websiteIds.add(selectedWebsiteId)
        const site = websites.find((w) => w.id === selectedWebsiteId)
        if (site) universeIds.add(site.universeId)
        active = true
        dimOthers = 0.4
      } else if (overlay === 'search' && searchQuery.trim() && searchResults) {
        // The overlay owns the search (API or local fallback); the scene just mirrors it.
        const results = searchResults
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

      // Far ends of the drawn connections keep a minimum presence.
      const relationIds = new Set<string>()
      for (const r of visibleRelationships) {
        relationIds.add(r.sourceId)
        relationIds.add(r.targetId)
      }
      sceneMotion.relations.websiteIds = relationIds
      sceneMotion.relations.active = relationIds.size > 0

      const filterActive = hasActiveFilters(filters)
      sceneMotion.filter.active = filterActive
      const context = filters.discovery ? discoveryFilterContext(selectedWebsiteId) : undefined
      sceneMotion.filter.websiteIds = filterActive ? new Set(applyFilters(websites, filters, context).map((w) => w.id)) : new Set()
    }

    apply()
    const unsubscribeCatalog = useCatalogStore.subscribe((state, previous) => {
      if (state.websites !== previous.websites) apply()
    })
    const unsubscribe = useGalaxyStore.subscribe((state, previous) => {
      if (state.searchQuery !== previous.searchQuery || state.searchResults !== previous.searchResults) {
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
        state.selectedWebsiteId !== previous.selectedWebsiteId ||
        state.highlight !== previous.highlight ||
        state.visibleRelationships !== previous.visibleRelationships
      ) {
        apply()
      }
    })
    return () => {
      window.clearTimeout(debounce)
      unsubscribe()
      unsubscribeCatalog()
      sceneMotion.emphasis.active = false
      sceneMotion.filter.active = false
      sceneMotion.relations.active = false
    }
  }, [])

  return null
}
