// Legacy config export - use config-loader.ts for new code
import { config as appConfig } from './config-loader.js'

// Maintain backward compatibility with existing code
export const config = {
  PORT: appConfig.server.port,
  NODE_ENV: appConfig.env,
  
  WALRUS_ENDPOINT: appConfig.walrus.endpoint,
  WALRUS_AGGREGATOR: appConfig.walrus.aggregator,
  WALRUS_NETWORK: appConfig.walrus.network,
  
  REDIS_URL: appConfig.cache.redisUrl,
  CACHE_TTL: appConfig.cache.ttl,
  MAX_CACHE_SIZE: appConfig.cache.maxSize,
  
  API_KEY_SECRET: appConfig.secrets.apiKeySecret,
  ALLOWED_ORIGINS: appConfig.server.cors.origins.join(','),
  
  ENABLE_ANALYTICS: appConfig.monitoring.enableAnalytics,
  WEBHOOK_URL: appConfig.monitoring.webhookUrl,
  
  TUSKY_API_URL: appConfig.integrations.tusky.apiUrl,
  TUSKY_API_KEY: appConfig.secrets.tuskyApiKey,
  TUSKY_DEFAULT_VAULT_ID: appConfig.secrets.tuskyDefaultVaultId,
  
  IPFS_GATEWAY: appConfig.walrus.ipfs.gateway,
  ENABLE_IPFS_FALLBACK: appConfig.walrus.ipfs.fallbackEnabled,
}

// Export the new config for modern usage
export { appConfig }
export * from './config-loader.js'
