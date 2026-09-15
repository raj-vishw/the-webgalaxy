import { Suspense, lazy } from 'react'
import App from './App'
import { FallbackGalaxy } from './components/fallback/FallbackGalaxy'
import { isConsolePath } from './lib/consolePath'
import { supportsWebGL, wantsListView } from './lib/webgl'

// The content console — same build, its own screen, behind the sign-in; only served at its configured path.
const ConsoleApp = lazy(() => import('./console/ConsoleApp'))

/** Picks the screen for this URL: the console, the accessible list, or the galaxy. */
export function Root() {
  if (isConsolePath()) {
    return (
      <Suspense fallback={null}>
        <ConsoleApp />
      </Suspense>
    )
  }
  // No WebGL, or the visitor asked for the list: the same galaxy, as a list.
  const listView = wantsListView() ? 'requested' : supportsWebGL() ? null : 'no-webgl'
  return listView ? <FallbackGalaxy reason={listView} /> : <App />
}
