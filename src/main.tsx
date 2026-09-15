import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import { startAnalytics } from './lib/analytics'
import { isConsolePath } from './lib/consolePath'
import './styles/index.css'

if (!isConsolePath()) startAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
