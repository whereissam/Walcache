/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext', // Support top-level await
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          react: ['react', 'react-dom'],
          // Router and query libraries
          router: ['@tanstack/react-router'],
          query: ['@tanstack/react-query'],
          // UI libraries
          ui: ['lucide-react', 'recharts'],
          // SDK chunk
          sdk: ['./packages/sdk/src/index.js'],
        },
      },
    },
  },
  // Vite natively exposes VITE_* env vars via import.meta.env
  // Legacy REACT_APP_* vars are forwarded for backward compatibility
  define: {
    'import.meta.env.REACT_APP_WALCACHE_URL': JSON.stringify(
      process.env.REACT_APP_WALCACHE_URL || '',
    ),
    'import.meta.env.REACT_APP_WALCACHE_API_KEY': JSON.stringify(
      process.env.REACT_APP_WALCACHE_API_KEY || '',
    ),
  },
})
