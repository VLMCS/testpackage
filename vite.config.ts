import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// If you rename the GitHub repo, change BASE_PATH to match (e.g. '/new-repo-name/').
// For a custom domain, set BASE_PATH to '/'.
const BASE_PATH = '/testpackage/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE_PATH : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split the large vendor libraries into their own cacheable chunks
          // (also clears Vite's >500 kB single-chunk warning). Firestore is the
          // heaviest, so it gets its own chunk separate from auth/app.
          'firebase-firestore': ['firebase/firestore'],
          'firebase-core': ['firebase/app', 'firebase/auth'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Jan & Aki — Budget Tracker',
        short_name: 'Budget',
        description: 'Household budget tracker for Jan and Aki',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: command === 'build' ? BASE_PATH : '/',
        scope: command === 'build' ? BASE_PATH : '/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: command === 'build' ? `${BASE_PATH}index.html` : '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
}));
