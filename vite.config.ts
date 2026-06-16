import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/botstock/',
  server: {
    host: true, // หรือ '127.0.0.1' เพื่อรับรองรับการแมป domain 'botstock'
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})
