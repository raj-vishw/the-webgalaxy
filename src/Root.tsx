import { Suspense, lazy } from 'react'
import App from './App'
import { FallbackGalaxy } from './components/fallback/FallbackGalaxy'
import { isAdminPath, supportsWebGL, wantsListView } from './lib/webgl'

// `/admin` is the administration area — same build, its own screen, behind the administrator's sign-in.
const AdminApp = lazy(() => import('./admin/AdminApp'))

/** Picks the screen for this URL: the admin, the accessible list, or the galaxy. */
export function Root() {
  if (isAdminPath()) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    )
  }
  // No WebGL, or the visitor asked for the list: the same galaxy, as a list.
  const listView = wantsListView() ? 'requested' : supportsWebGL() ? null : 'no-webgl'
  return listView ? <FallbackGalaxy reason={listView} /> : <App />
}
