import { z } from 'zod'

export const environmentSchema = z.enum([
  'development',
  'staging',
  'production',
  'test',
])
export type Environment = z.infer<typeof environmentSchema>

export interface EnvironmentConfig {
  server: {
    port: number
    host: string
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    cors: {
      origins: string[]
      credentials: boolean
    }
  }
  cache: {
    ttl: number
    maxSize: number
    redisUrl: string
  }
  walrus: {
    network: 'testnet' | 'mainnet'
    endpoint: string
    aggregator: string
    ipfs: {
      gateway: string
      fallbackEnabled: boolean
    }
  }
  security: {
    helmet: {
      contentSecurityPolicy: boolean
      crossOriginEmbedderPolicy: boolean
    }
    rateLimit: {
      max: number
      timeWindow: string
    }
  }
  monitoring: {
    enableAnalytics: boolean
    enableMetrics: boolean
    webhookUrl?: string
  }
  integrations: {
    tusky: {
      apiUrl: string
      apiKey?: string
      defaultVaultId?: string
    }
    seal: {
      enabled: boolean
      defaultThreshold: number
      defaultPackageId?: string
    }
  }
}

export const developmentConfig: EnvironmentConfig = {
  server: {
    port: 4500,
    host: '0.0.0.0',
    logLevel: 'info',
    cors: {
      origins: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4500',
      ],
      credentials: true,
    },
  },
  cache: {
    ttl: 3600,
    maxSize: 100,
    redisUrl: 'redis://localhost:6379',
  },
  walrus: {
    network: 'testnet',
    endpoint: 'https://publisher.walrus-testnet.walrus.space',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space',
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      fallbackEnabled: true,
    },
  },
  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    },
    rateLimit: {
      max: 1000,
      timeWindow: '1 minute',
    },
  },
  monitoring: {
    enableAnalytics: true,
    enableMetrics: true,
  },
  integrations: {
    tusky: {
      apiUrl: 'https://api.tusky.io',
    },
    seal: {
      enabled: true,
      defaultThreshold: 2,
    },
  },
}

export const stagingConfig: EnvironmentConfig = {
  server: {
    port: 4500,
    host: '0.0.0.0',
    logLevel: 'warn',
    cors: {
      origins: ['https://staging.walcache.com'],
      credentials: true,
    },
  },
  cache: {
    ttl: 7200,
    maxSize: 500,
    redisUrl: 'redis://redis:6379',
  },
  walrus: {
    network: 'testnet',
    endpoint: 'https://publisher.walrus-testnet.walrus.space',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space',
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      fallbackEnabled: true,
    },
  },
  security: {
    helmet: {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
    },
    rateLimit: {
      max: 500,
      timeWindow: '1 minute',
    },
  },
  monitoring: {
    enableAnalytics: true,
    enableMetrics: true,
  },
  integrations: {
    tusky: {
      apiUrl: 'https://api.tusky.io',
    },
    seal: {
      enabled: true,
      defaultThreshold: 3,
    },
  },
}

export const productionConfig: EnvironmentConfig = {
  server: {
    port: 4500,
    host: '0.0.0.0',
    logLevel: 'error',
    cors: {
      origins: ['https://walcache.com'],
      credentials: true,
    },
  },
  cache: {
    ttl: 86400,
    maxSize: 10000,
    redisUrl: 'redis://redis:6379',
  },
  walrus: {
    network: 'mainnet',
    endpoint: 'https://publisher.walrus.space',
    aggregator: 'https://aggregator.walrus.space',
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      fallbackEnabled: true,
    },
  },
  security: {
    helmet: {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
    },
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
  monitoring: {
    enableAnalytics: true,
    enableMetrics: true,
  },
  integrations: {
    tusky: {
      apiUrl: 'https://api.tusky.io',
    },
    seal: {
      enabled: true,
      defaultThreshold: 3,
    },
  },
}

export const testConfig: EnvironmentConfig = {
  server: {
    port: 4501,
    host: '0.0.0.0',
    logLevel: 'debug',
    cors: {
      origins: ['http://localhost:3000'],
      credentials: true,
    },
  },
  cache: {
    ttl: 60,
    maxSize: 10,
    redisUrl: 'redis://localhost:6379',
  },
  walrus: {
    network: 'testnet',
    endpoint: 'https://publisher.walrus-testnet.walrus.space',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space',
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      fallbackEnabled: false,
    },
  },
  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    },
    rateLimit: {
      max: 10000,
      timeWindow: '1 minute',
    },
  },
  monitoring: {
    enableAnalytics: false,
    enableMetrics: false,
  },
  integrations: {
    tusky: {
      apiUrl: 'https://api.tusky.io',
    },
    seal: {
      enabled: false,
      defaultThreshold: 2,
    },
  },
}

export const environmentConfigs: Record<Environment, EnvironmentConfig> = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig,
  test: testConfig,
}
