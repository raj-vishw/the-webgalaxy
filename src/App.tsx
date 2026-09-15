import { WebGalaxyScene } from './components/3d/WebGalaxyScene'
import { ExplorationContext } from './components/ui/ExplorationContext'
import { GalaxyTitle } from './components/ui/GalaxyTitle'
import { InteractionHint } from './components/ui/InteractionHint'
import { IntroSkip } from './components/ui/IntroSkip'
import { Navigation } from './components/ui/Navigation'
import { WebsitePlaceholder } from './components/ui/WebsitePlaceholder'
import { useExplorationKeys } from './hooks/useExplorationKeys'

export default function App() {
  useExplorationKeys()
  return (
    <main className="relative h-full w-full overflow-hidden bg-space-950">
      <WebGalaxyScene />
      <GalaxyTitle />
      <Navigation />
      <ExplorationContext />
      <WebsitePlaceholder />
      <InteractionHint />
      <IntroSkip />
    </main>
  )
}
