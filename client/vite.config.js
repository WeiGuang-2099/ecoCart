import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'EcoCart Australia',
        short_name: 'EcoCart',
        description: 'Australian Supermarket Carbon Footprint Scanner',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#27ae60',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'off-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ecocart-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/privacy-policy': 'http://localhost:5000'
    }
  }
})
