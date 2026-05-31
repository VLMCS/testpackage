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
          'firebase-core': ['firebase/app', 'firebase/auth', 'firebase/app-check'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png'],
      manifest: {
        name: 'Clerune Tracker',
        short_name: 'Clerune',
        description: 'Clerune budget tracker',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: command === 'build' ? BASE_PATH : '/',
        scope: command === 'build' ? BASE_PATH : '/',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: command === 'build' ? `${BASE_PATH}index.html` : '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
}));
