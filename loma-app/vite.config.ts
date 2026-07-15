import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow tunneling the dev server (e.g. ngrok) so the QR flow can be tested on a
    // real phone over HTTPS — required for camera access. A leading dot allows any
    // subdomain, so it survives ngrok's rotating URLs.
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'],
  },
})
