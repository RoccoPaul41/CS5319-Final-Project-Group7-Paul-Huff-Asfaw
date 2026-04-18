import { defineConfig, loadEnv } from 'vite'

import react from '@vitejs/plugin-react'

export default defineConfig(( { mode }) => 
  {
  const env = loadEnv ( mode,  process.cwd(),  '')

  const proxyTarget = env.PROXY_TARGET ||'http://localhost:3002' //here is the backend server address

  const apiProxy = 
  {
    '/api': 
    {
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

