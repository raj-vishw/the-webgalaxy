import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FallbackGalaxy } from './components/fallback/FallbackGalaxy'
import { startAnalytics } from './lib/analytics'
import { supportsWebGL, wantsListView } from './lib/webgl'
import './styles/index.css'

startAnalytics()

// No WebGL, or the visitor asked for the list: the same galaxy, as a list.
const listView = wantsListView() ? 'requested' : supportsWebGL() ? null : 'no-webgl'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{listView ? <FallbackGalaxy reason={listView} /> : <App />}</StrictMode>,
)
