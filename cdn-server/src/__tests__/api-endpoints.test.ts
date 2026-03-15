import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    PORT: 4501,
    NODE_ENV: 'test',
    WALRUS_ENDPOINT: 'https://publisher.walrus-testnet.walrus.space',
    WALRUS_AGGREGATOR: 'https://aggregator.walrus-testnet.walrus.space',
    WALRUS_NETWORK: 'testnet',
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 60,
    MAX_CACHE_SIZE: 10,
    API_KEY_SECRET: 'test-secret-minimum-32-characters-long-here',
    WEBHOOK_SECRET: undefined,
    ALLOWED_ORIGINS: 'http://localhost:3000',
    ENABLE_ANALYTICS: false,
    WEBHOOK_URL: undefined,
    TUSKY_API_URL: 'https://api.tusky.io',
    TUSKY_API_KEY: undefined,
    TUSKY_DEFAULT_VAULT_ID: undefined,
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/',
    ENABLE_IPFS_FALLBACK: false,
    WALRUS_EPOCH_DURATION: 300,
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
  appConfig: {
    env: 'test',
    server: {
      port: 4501,
      host: '0.0.0.0',
      logLevel: 'error',
      cors: { origins: ['http://localhost:3000'], credentials: true },
    },
    cache: {
      ttl: 60,
      maxSize: 10,
      redisUrl: 'redis://localhost:6379',
      persistenceDir: './data/cache-test',
      enablePersistence: false,
    },
    walrus: {
      network: 'testnet',
      endpoint: 'https://publisher.walrus-testnet.walrus.space',
      aggregator: 'https://aggregator.walrus-testnet.walrus.space',
      epochDurationSeconds: 300,
      ipfs: { gateway: 'https://ipfs.io/ipfs/', fallbackEnabled: false },
    },
    security: {
      helmet: { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false },
      rateLimit: { max: 10000, timeWindow: '1 minute' },
    },
    monitoring: { enableAnalytics: false, enableMetrics: false },
    integrations: {
      tusky: { apiUrl: 'https://api.tusky.io' },
      seal: { enabled: false, defaultThreshold: 2 },
    },
    secrets: {
      apiKeySecret: 'test-secret-minimum-32-characters-long-here',
    },
  },
}))

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockRejectedValue(new Error('no redis')),
      disconnect: vi.fn(),
      on: vi.fn(),
    })),
  }
})

import { endpointHealthService } from '../services/endpoint-health.js'
import { userService } from '../services/user.js'

describe('Endpoint Health API', () => {
  it('should return health status with aggregators and publishers', () => {
    const status = endpointHealthService.getHealthStatus()

    expect(status).toBeDefined()
    expect(status.aggregators).toBeDefined()
    expect(status.aggregators.total).toBeGreaterThanOrEqual(0)
    expect(status.aggregators.healthy).toBeGreaterThanOrEqual(0)
    expect(status.publishers).toBeDefined()
    expect(status.publishers.total).toBeGreaterThanOrEqual(0)
    expect(status.network).toBe('testnet')
    expect(status.overall).toBeDefined()
    expect(typeof status.overall.healthy).toBe('boolean')
    expect(typeof status.overall.score).toBe('number')
    expect(status.lastCheck).toBeDefined()
  })

  it('should return details for each endpoint', () => {
    const status = endpointHealthService.getHealthStatus()

    expect(status.aggregators.details).toBeDefined()
    expect(Array.isArray(status.aggregators.details)).toBe(true)
    expect(status.publishers.details).toBeDefined()
    expect(Array.isArray(status.publishers.details)).toBe(true)
  })

  it('should return avgResponseTime', () => {
    const status = endpointHealthService.getHealthStatus()

    expect(typeof status.aggregators.avgResponseTime).toBe('number')
    expect(typeof status.publishers.avgResponseTime).toBe('number')
  })
})

describe('Pricing API', () => {
  beforeEach(async () => {
    await userService.initialize()
  })

  it('should return subscription plans', () => {
    const plans = userService.getSubscriptionPlans()

    expect(plans).toBeDefined()
    expect(plans.length).toBe(4) // FREE, STARTER, PROFESSIONAL, ENTERPRISE
  })

  it('should include free tier at $0', () => {
    const plans = userService.getSubscriptionPlans()
    const free = plans.find((p) => p.tier === 'free')

    expect(free).toBeDefined()
    expect(free!.price).toBe(0)
    expect(free!.name).toBe('Free')
  })

  it('should include starter tier at $29', () => {
    const plans = userService.getSubscriptionPlans()
    const starter = plans.find((p) => p.tier === 'starter')

    expect(starter).toBeDefined()
    expect(starter!.price).toBe(29)
  })

  it('should include professional tier at $99', () => {
    const plans = userService.getSubscriptionPlans()
    const pro = plans.find((p) => p.tier === 'professional')

    expect(pro).toBeDefined()
    expect(pro!.price).toBe(99)
  })

  it('should include enterprise tier at $299', () => {
    const plans = userService.getSubscriptionPlans()
    const enterprise = plans.find((p) => p.tier === 'enterprise')

    expect(enterprise).toBeDefined()
    expect(enterprise!.price).toBe(299)
  })

  it('should have rate limits that scale with tier', () => {
    const plans = userService.getSubscriptionPlans()
    const sorted = [...plans].sort((a, b) => a.price - b.price)

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].limits.requestsPerMinute).toBeGreaterThan(
        sorted[i - 1].limits.requestsPerMinute,
      )
      expect(sorted[i].limits.requestsPerMonth).toBeGreaterThan(
        sorted[i - 1].limits.requestsPerMonth,
      )
      expect(sorted[i].limits.bandwidthPerMonth).toBeGreaterThan(
        sorted[i - 1].limits.bandwidthPerMonth,
      )
    }
  })

  it('should have features array for each plan', () => {
    const plans = userService.getSubscriptionPlans()

    for (const plan of plans) {
      expect(plan.features).toBeDefined()
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    }
  })

  it('should all be active plans', () => {
    const plans = userService.getSubscriptionPlans()

    for (const plan of plans) {
      expect(plan.isActive).toBe(true)
    }
  })
})
