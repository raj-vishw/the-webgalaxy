import { WebGalaxyScene } from './components/3d/WebGalaxyScene'
import { GalaxyNavigation } from './components/ui/GalaxyNavigation'
import { GalaxyTitle } from './components/ui/GalaxyTitle'
import { InteractionHints } from './components/ui/InteractionHints'
import { IntroSkip } from './components/ui/IntroSkip'
import { LocationIndicator } from './components/ui/LocationIndicator'
import { UniverseInfo } from './components/ui/UniverseInfo'
import { WebsiteInfoPanel } from './components/ui/WebsiteInfoPanel'
import { useExplorationKeys } from './hooks/useExplorationKeys'

export default function App() {
  useExplorationKeys()
  return (
    <main className="relative h-full w-full overflow-hidden bg-space-950">
      <WebGalaxyScene />
      <GalaxyTitle />
      <GalaxyNavigation />
      <LocationIndicator />
      <UniverseInfo />
      <WebsiteInfoPanel />
      <InteractionHints />
      <IntroSkip />
    </main>
  )
}
