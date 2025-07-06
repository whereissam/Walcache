// Environment configuration utility
// Safely access environment variables in the browser

interface WalcacheConfig {
  baseUrl: string
  apiKey: string
  isDevelopment: boolean
  isProduction: boolean
}

// Safe environment variable access
function getEnvVar(key: string, fallback: string = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback
  }
  
  // Fallback for browser environments where process is not defined
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || fallback
  }
  
  return fallback
}

// Main configuration
export const ENV_CONFIG: WalcacheConfig = {
  baseUrl: getEnvVar('REACT_APP_WALCACHE_URL', 'http://localhost:4500'),
  apiKey: getEnvVar('REACT_APP_WALCACHE_API_KEY', 'dev-secret-walcache-2024'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
}

// Export individual values for convenience
export const {
  baseUrl: WALCACHE_BASE_URL,
  apiKey: WALCACHE_API_KEY,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
} = ENV_CONFIG

// Debug logging in development
if (IS_DEVELOPMENT && typeof console !== 'undefined') {
  console.log('🔧 Walcache Config:', {
    baseUrl: WALCACHE_BASE_URL,
    apiKey: WALCACHE_API_KEY?.slice(0, 10) + '...',
    environment: IS_DEVELOPMENT ? 'development' : 'production'
  })
}