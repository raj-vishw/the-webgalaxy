import { useEffect, useState } from 'react'
import { PerfReadout } from './components/3d/PerfMonitor'
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
import { MobileBar } from './components/ui/MobileBar'
import { UniverseNavigator } from './components/navigation/UniverseNavigator'
import { SearchOverlay } from './components/search/SearchOverlay'
import { SubmitWebsiteForm } from './components/submission/SubmitWebsiteForm'
import { GalaxyNavigation } from './components/ui/GalaxyNavigation'
import { HelpMenu } from './components/ui/HelpMenu'
import { InteractionHints } from './components/ui/InteractionHints'
import { IntroSkip } from './components/ui/IntroSkip'
import { UniverseInfo } from './components/ui/UniverseInfo'
import { WebsiteInfoPanel } from './components/ui/WebsiteInfoPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { applyLocation, startRouter } from './lib/router'
import { useCatalogStore } from './store/catalogStore'
import { useGalaxyStore } from './store/galaxyStore'
import { locationTitle } from './utils/navigation'

export default function App() {
  useKeyboardShortcuts()
  // Development-only performance readout (P key or ?perf).
  const [perf, setPerf] = useState(() => import.meta.env.DEV && window.location.search.includes('perf'))
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const toggle = () => setPerf((v) => !v)
    window.addEventListener('webgalaxy:perf', toggle)
    return () => window.removeEventListener('webgalaxy:perf', toggle)
  }, [])

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

  // The address bar follows the explorer; a deep link is applied once the
  // galaxy is entered (the flight there is the same as any other).
  useEffect(() => {
    document.title = locationTitle()
    const stopRouter = startRouter()
    const unsubscribe = useGalaxyStore.subscribe((state, previous) => {
      if (state.viewMode !== previous.viewMode || state.activeUniverseId !== previous.activeUniverseId || state.selectedWebsiteId !== previous.selectedWebsiteId) {
        document.title = locationTitle()
      }
      if (state.introPhase === 'complete' && previous.introPhase !== 'complete' && window.location.pathname !== '/') {
        window.setTimeout(() => applyLocation(), 150)
      }
    })
    return () => {
      stopRouter()
      unsubscribe()
    }
  }, [])

  return (
    <main className="relative h-full w-full overflow-hidden bg-space-950">
      <WebGalaxyScene />
      <Landing />
      <Onboarding />
      <GalaxyNavigation />
      <MobileBar />
      <LocationIndicator />
      <UniverseInfo />
      <WebsiteInfoPanel />
      <InteractionHints />
      <GalaxyMinimap />
      <UniverseNavigator />
      <DiscoveryMenu />
      <FilterPanel />
      <HelpMenu />
      <SearchOverlay />
      <SubmitWebsiteForm />
      <DataStatus />
      <DiscoveryAnimation />
      <IntroSkip />
      <LoadingScreen />
      {import.meta.env.DEV && <PerfReadout visible={perf} />}
    </main>
  )
}
