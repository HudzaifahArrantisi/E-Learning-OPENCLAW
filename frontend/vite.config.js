import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('three') || id.includes('postprocessing')) return 'vendor-3d'
          if (id.includes('face-api.js')) return 'vendor-faceapi'

          return undefined
        },
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,

    // Proxy untuk mengalihkan request /api ke backend Go
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },

    // Izinkan domain ngrok / cloudflare tunnel / lainnya
    allowedHosts: true,
  },
})
