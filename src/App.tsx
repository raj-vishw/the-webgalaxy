import { useEffect } from 'react'
import { WebGalaxyScene } from './components/3d/WebGalaxyScene'
import { DiscoveryAnimation } from './components/discovery/DiscoveryAnimation'
import { DiscoveryButton } from './components/discovery/DiscoveryButton'
import { FilterPanel } from './components/filters/FilterPanel'
import { GalaxyMinimap } from './components/navigation/GalaxyMinimap'
import { LocationIndicator } from './components/navigation/LocationIndicator'
import { UniverseNavigator } from './components/navigation/UniverseNavigator'
import { SearchOverlay } from './components/search/SearchOverlay'
import { GalaxyNavigation } from './components/ui/GalaxyNavigation'
import { GalaxyTitle } from './components/ui/GalaxyTitle'
import { InteractionHints } from './components/ui/InteractionHints'
import { IntroSkip } from './components/ui/IntroSkip'
import { UniverseInfo } from './components/ui/UniverseInfo'
import { WebsiteInfoPanel } from './components/ui/WebsiteInfoPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGalaxyStore } from './store/galaxyStore'
import { locationTitle } from './utils/navigation'

export default function App() {
  useKeyboardShortcuts()

  // Route-shaped title so the browser tab says where you are (no router yet).
  useEffect(() => {
    document.title = locationTitle()
    return useGalaxyStore.subscribe((state, previous) => {
      if (state.viewMode !== previous.viewMode || state.activeUniverseId !== previous.activeUniverseId || state.selectedWebsiteId !== previous.selectedWebsiteId) {
        document.title = locationTitle()
      }
    })
  }, [])

  return (
    <main className="relative h-full w-full overflow-hidden bg-space-950">
      <WebGalaxyScene />
      <GalaxyTitle />
      <GalaxyNavigation />
      <LocationIndicator />
      <UniverseInfo />
      <WebsiteInfoPanel />
      <InteractionHints />
      <GalaxyMinimap />
      <UniverseNavigator />
      <DiscoveryButton />
      <FilterPanel />
      <SearchOverlay />
      <DiscoveryAnimation />
      <IntroSkip />
    </main>
  )
}
