import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import { startAnalytics } from './lib/analytics'
import { isAdminPath } from './lib/webgl'
import './styles/index.css'

if (!isAdminPath()) startAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
