// ============================================
// LAYER: Client Connector (Dev Proxy)
// api.js uses baseURL "/api" in dev so every request hits this dev server first,
// then Vite forwards to Express. That way you are never stuck calling the wrong port.
// Set PROXY_TARGET in Selected/frontend/.env to match backend PORT (e.g. http://localhost:3001).
// ============================================

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.PROXY_TARGET || 'http://localhost:3002'

  const apiProxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true
    }
  }

  return {
    plugins: [react()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy }
  }
})

