import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { bootstrapImpact } from './bootstrap'
import { applyIncomingDeepLink } from './qr'
import { loadProviders } from './providersApi'

async function boot() {
  // Pull the provider catalog from the database first (falls back to bundled JSON
  // if the API is down), so everything downstream scores/renders the DB data.
  await loadProviders()
  bootstrapImpact()
  // If opened from a scanned share QR, register the shared picks and start as Tourist.
  const initialPersona = applyIncomingDeepLink()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialPersona={initialPersona ?? undefined} />
    </StrictMode>,
  )
}

boot()
