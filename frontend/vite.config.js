import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'NF Student Hub',
        short_name: 'StudentHub',
        description: 'Portal Akademik Mahasiswa & Dosen NF Student Hub',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/openclaw.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/openclaw1.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/claw1.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any maskable',
          }
        ]
      }
    })
  ],
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
