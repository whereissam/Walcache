import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock config before importing cache service
vi.mock('../config/index.js', () => ({
  config: {
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 3600,
    MAX_CACHE_SIZE: 100,
    WALRUS_EPOCH_DURATION: 86400, // 24 hours in seconds
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
  appConfig: {
    cache: {
      ttl: 3600,
      maxSize: 100,
      redisUrl: 'redis://localhost:6379',
      persistenceDir: './data/cache-test',
      enablePersistence: false,
    },
    walrus: {
      epochDurationSeconds: 86400,
    },
  },
}))

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockRejectedValue(new Error('no redis in test')),
      disconnect: vi.fn(),
      on: vi.fn(),
    })),
  }
})

import { CacheService } from '../services/cache.js'
import type { CachedBlob } from '../types/cache.js'

function makeBlob(cid: string, overrides?: Partial<CachedBlob>): CachedBlob {
  return {
    cid,
    data: Buffer.from('test data'),
    contentType: 'text/plain',
    size: 9,
    timestamp: new Date(),
    cached: new Date(),
    ttl: 3600,
    pinned: false,
    ...overrides,
  }
}

describe('CacheService - Epoch-Aware TTL', () => {
  let cache: CacheService

  beforeEach(async () => {
    cache = new CacheService()
    await cache.initialize()
  })

  afterEach(async () => {
    await cache.destroy()
  })

  it('should return TTL that does not exceed epoch duration', () => {
    const ttl = cache.getEpochAwareTTL(100000) // request 100k seconds
    const epochDuration = 86400 // configured epoch duration

    expect(ttl).toBeLessThanOrEqual(epochDuration)
  })

  it('should return requested TTL when shorter than remaining epoch time', () => {
    const shortTTL = 60 // 1 minute - always shorter than epoch
    const ttl = cache.getEpochAwareTTL(shortTTL)

    expect(ttl).toBeLessThanOrEqual(shortTTL)
  })

  it('should use config CACHE_TTL when no TTL specified', () => {
    const ttl = cache.getEpochAwareTTL()
    // Should be at most CACHE_TTL (3600) and at most remaining epoch time
    expect(ttl).toBeLessThanOrEqual(3600)
    expect(ttl).toBeGreaterThan(0)
  })

  it('should always return a positive TTL', () => {
    const ttl = cache.getEpochAwareTTL(3600)
    expect(ttl).toBeGreaterThan(0)
  })

  it('should cap TTL at epoch boundary', () => {
    // Request a TTL much larger than the epoch
    const ttl = cache.getEpochAwareTTL(999999)
    expect(ttl).toBeLessThanOrEqual(86400)
  })

  it('should set epoch-aware TTL when caching a blob', async () => {
    const blob = makeBlob('test-cid-1')
    await cache.set('test-cid-1', blob)

    const retrieved = await cache.get('test-cid-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.cid).toBe('test-cid-1')
  })

  it('should include epoch info in stats', async () => {
    const stats = await cache.getStats()

    expect(stats.epoch).toBeDefined()
    expect(stats.epoch!.epochDurationSeconds).toBe(86400)
    expect(stats.epoch!.remainingSeconds).toBeGreaterThanOrEqual(0)
    expect(stats.epoch!.remainingSeconds).toBeLessThanOrEqual(86400)
    expect(stats.epoch!.currentEpochStart).toBeDefined()
  })
})

describe('CacheService - Basic Operations (memory fallback)', () => {
  let cache: CacheService

  beforeEach(async () => {
    cache = new CacheService()
    await cache.initialize()
  })

  afterEach(async () => {
    await cache.clear()
    await cache.destroy()
  })

  it('should store and retrieve a blob', async () => {
    const blob = makeBlob('abc123')
    await cache.set('abc123', blob)

    const result = await cache.get('abc123')
    expect(result).not.toBeNull()
    expect(result!.cid).toBe('abc123')
    expect(result!.contentType).toBe('text/plain')
    expect(result!.size).toBe(9)
  })

  it('should return null for missing blob', async () => {
    const result = await cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('should delete a blob', async () => {
    const blob = makeBlob('to-delete')
    await cache.set('to-delete', blob)
    await cache.delete('to-delete')

    const result = await cache.get('to-delete')
    expect(result).toBeNull()
  })

  it('should clear all blobs', async () => {
    await cache.set('a', makeBlob('a'))
    await cache.set('b', makeBlob('b'))
    await cache.clear()

    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBeNull()
  })

  it('should pin a blob (infinite TTL)', async () => {
    const blob = makeBlob('pinme')
    await cache.set('pinme', blob)
    await cache.pin('pinme')

    // Blob should still be accessible
    const result = await cache.get('pinme')
    expect(result).not.toBeNull()
  })

  it('should report health status', async () => {
    const health = await cache.healthCheck()
    expect(health.status).toBe('healthy')
    expect(health.using).toBe('memory') // Redis is mocked to fail
  })

  it('should return stats', async () => {
    const stats = await cache.getStats()
    expect(stats.using).toBe('memory')
    expect(stats.memory).toBeDefined()
    expect(stats.memory.keys).toBeGreaterThanOrEqual(0)
    expect(stats.persistence).toBeDefined()
    expect(stats.persistence!.enabled).toBe(false)
  })
})
