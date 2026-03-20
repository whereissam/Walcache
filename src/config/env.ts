// Environment configuration utility
// Uses Vite's import.meta.env for browser-safe env access

interface WalcacheConfig {
  baseUrl: string
  apiUrl: string
  apiKey: string
  isDevelopment: boolean
  isProduction: boolean
}

const DEFAULT_BASE_URL = 'http://localhost:4500'

// Main configuration using Vite env variables (VITE_ prefix)
export const ENV_CONFIG: WalcacheConfig = {
  baseUrl:
    import.meta.env.VITE_WALCACHE_URL ||
    import.meta.env.REACT_APP_WALCACHE_URL ||
    DEFAULT_BASE_URL,
  apiUrl:
    (import.meta.env.VITE_WALCACHE_URL ||
      import.meta.env.REACT_APP_WALCACHE_URL ||
      DEFAULT_BASE_URL) + '/api',
  apiKey: import.meta.env.VITE_WALCACHE_API_KEY || '',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

// Export individual values for convenience
export const {
  baseUrl: WALCACHE_BASE_URL,
  apiUrl: WALCACHE_API_URL,
  apiKey: WALCACHE_API_KEY,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
} = ENV_CONFIG

// Debug logging in development
if (IS_DEVELOPMENT && typeof console !== 'undefined') {
  console.log('Walcache Config:', {
    baseUrl: WALCACHE_BASE_URL,
    apiKey: WALCACHE_API_KEY ? WALCACHE_API_KEY.slice(0, 10) + '...' : '(none)',
    environment: IS_DEVELOPMENT ? 'development' : 'production',
  })
}
