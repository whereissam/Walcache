import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

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
  define: {
    // Make environment variables available in the browser
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development',
    ),
    'process.env.REACT_APP_WALCACHE_URL': JSON.stringify(
      process.env.REACT_APP_WALCACHE_URL,
    ),
    'process.env.REACT_APP_WALCACHE_API_KEY': JSON.stringify(
      process.env.REACT_APP_WALCACHE_API_KEY,
    ),
  },
})
