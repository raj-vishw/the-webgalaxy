import { useEffect } from 'react'
import { WebGalaxyScene } from './components/3d/WebGalaxyScene'
import { DataStatus } from './components/data/DataStatus'
import { Landing } from './components/entry/Landing'
import { LoadingScreen } from './components/entry/LoadingScreen'
import { Onboarding } from './components/entry/Onboarding'
import { DiscoveryAnimation } from './components/discovery/DiscoveryAnimation'
import { DiscoveryMenu } from './components/discovery/DiscoveryMenu'
import { FilterPanel } from './components/filters/FilterPanel'
import { GalaxyMinimap } from './components/navigation/GalaxyMinimap'
import { LocationIndicator } from './components/navigation/LocationIndicator'
import { UniverseNavigator } from './components/navigation/UniverseNavigator'
import { SearchOverlay } from './components/search/SearchOverlay'
import { SubmitWebsiteForm } from './components/submission/SubmitWebsiteForm'
import { GalaxyNavigation } from './components/ui/GalaxyNavigation'
import { InteractionHints } from './components/ui/InteractionHints'
import { IntroSkip } from './components/ui/IntroSkip'
import { UniverseInfo } from './components/ui/UniverseInfo'
import { WebsiteInfoPanel } from './components/ui/WebsiteInfoPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCatalogStore } from './store/catalogStore'
import { useGalaxyStore } from './store/galaxyStore'
import { locationTitle } from './utils/navigation'

export default function App() {
  useKeyboardShortcuts()

  // Progressive load: the scene is already rendering from cached/bundled
  // data; the API layers in universes, then websites, then connections.
  useEffect(() => {
    void useCatalogStore.getState().load()
    // Coming back to the tab after a while refreshes quietly, so newly
    // published websites appear without a reload.
    const onVisible = () => {
      const { fetchedAt, status } = useCatalogStore.getState()
      if (document.visibilityState === 'visible' && status !== 'loading' && (!fetchedAt || Date.now() - fetchedAt > 2 * 60_000)) {
        void useCatalogStore.getState().load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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
      <Landing />
      <Onboarding />
      <GalaxyNavigation />
      <LocationIndicator />
      <UniverseInfo />
      <WebsiteInfoPanel />
      <InteractionHints />
      <GalaxyMinimap />
      <UniverseNavigator />
      <DiscoveryMenu />
      <FilterPanel />
      <SearchOverlay />
      <SubmitWebsiteForm />
      <DataStatus />
      <DiscoveryAnimation />
      <IntroSkip />
      <LoadingScreen />
    </main>
  )
}
