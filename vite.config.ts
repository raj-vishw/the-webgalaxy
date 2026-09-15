import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks cache independently of app code.
        advancedChunks: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|@react-three[\\/](fiber|drei))[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand|gsap)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    // The public galaxy talks to the API on the same origin in development.
    proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4000', changeOrigin: true } },
  },
})
