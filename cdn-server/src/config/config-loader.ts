import { z } from 'zod'
import {
  environmentSchema,
  type Environment,
  type EnvironmentConfig,
  environmentConfigs,
} from './environments.js'

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: environmentSchema.default('development'),
  PORT: z.coerce.number().default(4500),
  HOST: z.string().default('127.0.0.1'),

  // Redis
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.coerce.number().optional(),
  MAX_CACHE_SIZE: z.coerce.number().optional(),

  // Walrus
  WALRUS_NETWORK: z.enum(['testnet', 'mainnet']).optional(),
  WALRUS_ENDPOINT: z.string().url().optional(),
  WALRUS_AGGREGATOR: z.string().url().optional(),

  // IPFS
  IPFS_GATEWAY: z.string().url().optional(),
  ENABLE_IPFS_FALLBACK: z.coerce.boolean().optional(),

  // Security
  API_KEY_SECRET: z.string().min(1).default('dev-secret-key'),
  ALLOWED_ORIGINS: z.string().optional(),

  // Monitoring
  ENABLE_ANALYTICS: z.coerce.boolean().optional(),
  ENABLE_METRICS: z.coerce.boolean().optional(),
  WEBHOOK_URL: z.string().url().optional().or(z.literal('')),

  // Tusky
  TUSKY_API_URL: z.string().url().optional(),
  TUSKY_API_KEY: z.string().optional(),
  TUSKY_DEFAULT_VAULT_ID: z.string().optional(),

  // Seal
  ENABLE_SEAL: z.coerce.boolean().optional(),
  SEAL_DEFAULT_THRESHOLD: z.coerce.number().optional(),
  SEAL_DEFAULT_PACKAGE_ID: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
})

export type EnvVars = z.infer<typeof envSchema>

export interface AppConfig extends EnvironmentConfig {
  env: Environment
  secrets: {
    apiKeySecret: string
    tuskyApiKey?: string
    tuskyDefaultVaultId?: string
  }
}

export class ConfigLoader {
  private static instance: ConfigLoader | null = null
  private config: AppConfig | null = null

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader()
    }
    return ConfigLoader.instance
  }

  load(): AppConfig {
    if (this.config) {
      return this.config
    }

    // Load and validate environment variables
    const env = this.loadEnvironmentVariables()

    // Get base configuration for environment
    const baseConfig = environmentConfigs[env.NODE_ENV]

    // Override with environment variables
    const config: AppConfig = {
      ...baseConfig,
      env: env.NODE_ENV,
      server: {
        ...baseConfig.server,
        port: env.PORT,
        host: env.HOST || baseConfig.server.host,
        logLevel: env.LOG_LEVEL || baseConfig.server.logLevel,
        cors: {
          ...baseConfig.server.cors,
          origins: env.ALLOWED_ORIGINS
            ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
            : baseConfig.server.cors.origins,
        },
      },
      cache: {
        ...baseConfig.cache,
        ttl: env.CACHE_TTL || baseConfig.cache.ttl,
        maxSize: env.MAX_CACHE_SIZE || baseConfig.cache.maxSize,
        redisUrl: env.REDIS_URL || baseConfig.cache.redisUrl,
      },
      walrus: {
        ...baseConfig.walrus,
        network: env.WALRUS_NETWORK || baseConfig.walrus.network,
        endpoint: env.WALRUS_ENDPOINT || baseConfig.walrus.endpoint,
        aggregator: env.WALRUS_AGGREGATOR || baseConfig.walrus.aggregator,
        ipfs: {
          ...baseConfig.walrus.ipfs,
          gateway: env.IPFS_GATEWAY || baseConfig.walrus.ipfs.gateway,
          fallbackEnabled:
            env.ENABLE_IPFS_FALLBACK ?? baseConfig.walrus.ipfs.fallbackEnabled,
        },
      },
      monitoring: {
        ...baseConfig.monitoring,
        enableAnalytics:
          env.ENABLE_ANALYTICS ?? baseConfig.monitoring.enableAnalytics,
        enableMetrics:
          env.ENABLE_METRICS ?? baseConfig.monitoring.enableMetrics,
        webhookUrl:
          env.WEBHOOK_URL && env.WEBHOOK_URL !== ''
            ? env.WEBHOOK_URL
            : baseConfig.monitoring.webhookUrl,
      },
      integrations: {
        ...baseConfig.integrations,
        tusky: {
          ...baseConfig.integrations.tusky,
          apiUrl: env.TUSKY_API_URL || baseConfig.integrations.tusky.apiUrl,
          apiKey: env.TUSKY_API_KEY || baseConfig.integrations.tusky.apiKey,
          defaultVaultId:
            env.TUSKY_DEFAULT_VAULT_ID ||
            baseConfig.integrations.tusky.defaultVaultId,
        },
        seal: {
          ...baseConfig.integrations.seal,
          enabled: env.ENABLE_SEAL ?? baseConfig.integrations.seal.enabled,
          defaultThreshold: env.SEAL_DEFAULT_THRESHOLD || baseConfig.integrations.seal.defaultThreshold,
          defaultPackageId: env.SEAL_DEFAULT_PACKAGE_ID || baseConfig.integrations.seal.defaultPackageId,
        },
      },
      secrets: {
        apiKeySecret: env.API_KEY_SECRET,
        tuskyApiKey: env.TUSKY_API_KEY,
        tuskyDefaultVaultId: env.TUSKY_DEFAULT_VAULT_ID,
      },
    }

    this.config = config
    return config
  }

  private loadEnvironmentVariables(): EnvVars {
    // Bun automatically loads .env files, so we can just use process.env
    // Parse and validate environment variables
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
      console.error('❌ Invalid environment configuration:')
      console.error(result.error.format())
      process.exit(1)
    }

    return result.data
  }

  reload(): AppConfig {
    this.config = null
    return this.load()
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.')
    }
    return this.config
  }
}

export const configLoader = ConfigLoader.getInstance()
export const config = configLoader.load()
