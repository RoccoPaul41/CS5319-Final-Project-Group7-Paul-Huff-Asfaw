// ============================================
// LAYER: Client Connector (Dev Proxy)
// This Vite proxy lets the browser call /api/* without CORS pain.
// It forwards requests from the Presentation Layer (React) to the
// API Layer (Express) running at http://localhost:3002.
// ============================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})

