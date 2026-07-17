import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { bootstrapImpact } from './bootstrap'
import { applyIncomingDeepLink } from './qr'
import { loadProviders } from './providersApi'
import { loadBookings } from './bookings'

async function boot() {
  // Pull the provider catalog + community bookings from the database first (both fall
  // back gracefully if the API is down), so everything downstream renders real DB data.
  await Promise.all([loadProviders(), loadBookings()])
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
