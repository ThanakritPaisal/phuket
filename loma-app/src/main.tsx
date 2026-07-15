import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { bootstrapImpact } from './bootstrap'
import { applyIncomingDeepLink } from './qr'

bootstrapImpact()
// If opened from a scanned share QR, register the shared picks and start as Tourist.
const initialPersona = applyIncomingDeepLink()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialPersona={initialPersona ?? undefined} />
  </StrictMode>,
)
