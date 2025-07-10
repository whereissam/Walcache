import Redis from 'ioredis'
import NodeCache from 'node-cache'
import { config } from '../config/index.js'
import type { CachedBlob, CacheStats } from '../types/cache.js'
import { CacheError, ErrorCode } from '../errors/base-error.js'

export interface ICacheService {
  initialize(): Promise<void>
  get(cid: string): Promise<CachedBlob | null>
  set(cid: string, blob: CachedBlob, ttl?: number): Promise<void>
  pin(cid: string): Promise<void>
  unpin(cid: string): Promise<void>
  isPinned(cid: string): Promise<boolean>
  delete(cid: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<CacheStats>
  healthCheck(): Promise<{ status: string; using: string }>
  warmCache(cids: string[]): Promise<void>
  preloadPopularContent(): Promise<void>
}

export class CacheService implements ICacheService {
  private redis: Redis | null = null
  private memoryCache: NodeCache
  private useRedis: boolean = true

  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: config.CACHE_TTL,
      maxKeys: config.MAX_CACHE_SIZE,
      checkperiod: 600,
      deleteOnExpire: true,
    })
  }

  async initialize(): Promise<void> {
    try {
      this.redis = new Redis(config.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 2000,
        // Enhanced connection pooling
        maxRetriesPerRequest: 1,
        keepAlive: true,
        family: 4,
        // Connection pool settings
        enableOfflineQueue: false,
        // Cluster support if needed
        enableReadyCheck: true,
        // Memory optimization
        db: 0,
        keyPrefix: 'wcdn:',
      })

      // Enhanced error handling
      this.redis.on('error', (error) => {
        console.warn('Redis connection error:', error.message)
        // Don't throw here - let the connection retry
      })

      this.redis.on('connect', () => {
        console.log('🔄 Redis connecting...')
      })

      this.redis.on('ready', () => {
        console.log('✅ Redis cache connected and ready')
      })

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...')
      })

      await this.redis.connect()

      // Test connection
      await this.redis.ping()
    } catch (error) {
      console.warn(
        '⚠️  Redis unavailable, falling back to memory cache:',
        error,
      )
      this.useRedis = false
      if (this.redis) {
        this.redis.disconnect()
        this.redis = null
      }
      throw new CacheError(
        'Failed to initialize Redis cache',
        ErrorCode.CACHE_CONNECTION_FAILED,
        { error: error instanceof Error ? error.message : String(error) },
      )
    }
  }

  async get(cid: string): Promise<CachedBlob | null> {
    const key = `blob:${cid}`

    if (this.useRedis && this.redis) {
      try {
        const cached = await this.redis.get(key)
        if (cached) {
          const parsed = JSON.parse(cached)
          // Convert data back to Buffer if it was serialized
          if (
            parsed.data &&
            parsed.data.type === 'Buffer' &&
            Array.isArray(parsed.data.data)
          ) {
            parsed.data = Buffer.from(parsed.data.data)
          }
          // Convert Date strings back to Date objects
          if (typeof parsed.timestamp === 'string') {
            parsed.timestamp = new Date(parsed.timestamp)
          }
          if (typeof parsed.cached === 'string') {
            parsed.cached = new Date(parsed.cached)
          }
          return parsed
        }
      } catch (error) {
        console.warn('Redis get error, falling back to memory:', error)
      }
    }

    return this.memoryCache.get<CachedBlob>(key) || null
  }

  async set(cid: string, blob: CachedBlob, ttl?: number): Promise<void> {
    const key = `blob:${cid}`
    const value = JSON.stringify(blob)
    const cacheTTL = ttl || config.CACHE_TTL

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(key, cacheTTL, value)
      } catch (error) {
        console.warn('Redis set error, falling back to memory:', error)
      }
    }

    this.memoryCache.set(key, blob, cacheTTL)
  }

  async pin(cid: string): Promise<void> {
    const key = `blob:${cid}`
    const pinKey = `pin:${cid}`

    if (this.useRedis && this.redis) {
      try {
        await this.redis.set(pinKey, '1')
        await this.redis.persist(key)
      } catch (error) {
        console.warn('Redis pin error:', error)
      }
    }

    const cached = this.memoryCache.get<CachedBlob>(key)
    if (cached) {
      this.memoryCache.set(key, cached, 0)
    }
  }

  async unpin(cid: string): Promise<void> {
    const key = `blob:${cid}`
    const pinKey = `pin:${cid}`

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(pinKey)
        await this.redis.expire(key, config.CACHE_TTL)
      } catch (error) {
        console.warn('Redis unpin error:', error)
      }
    }

    const cached = this.memoryCache.get<CachedBlob>(key)
    if (cached) {
      this.memoryCache.set(key, cached, config.CACHE_TTL)
    }
  }

  async isPinned(cid: string): Promise<boolean> {
    const pinKey = `pin:${cid}`

    if (this.useRedis && this.redis) {
      try {
        const pinned = await this.redis.get(pinKey)
        return pinned === '1'
      } catch (error) {
        console.warn('Redis isPinned error:', error)
      }
    }

    return false
  }

  async delete(cid: string): Promise<void> {
    const key = `blob:${cid}`
    const pinKey = `pin:${cid}`

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key, pinKey)
      } catch (error) {
        console.warn('Redis delete error:', error)
      }
    }

    this.memoryCache.del(key)
  }

  async clear(): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.flushdb()
      } catch (error) {
        console.warn('Redis clear error:', error)
      }
    }

    this.memoryCache.flushAll()
  }

  async getStats(): Promise<CacheStats> {
    const memoryStats = this.memoryCache.getStats()

    let redisStats = { keys: 0, memory: 0 }
    if (this.useRedis && this.redis) {
      try {
        const info = await this.redis.info('memory')
        const dbsize = await this.redis.dbsize()
        redisStats = {
          keys: dbsize,
          memory: parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0'),
        }
      } catch (error) {
        console.warn('Redis stats error:', error)
      }
    }

    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate:
          memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0,
      },
      redis: redisStats,
      using: this.useRedis ? 'redis' : 'memory',
    }
  }

  async healthCheck(): Promise<{ status: string; using: string }> {
    const using = this.useRedis ? 'redis' : 'memory'

    if (this.useRedis && this.redis) {
      try {
        await this.redis.ping()
        return { status: 'healthy', using }
      } catch {
        return { status: 'degraded', using: 'memory' }
      }
    }

    return { status: 'healthy', using }
  }

  async warmCache(cids: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${cids.length} CIDs...`)

    const batchSize = 10
    const batches = []

    for (let i = 0; i < cids.length; i += batchSize) {
      batches.push(cids.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      const warmPromises = batch.map(async (cid) => {
        try {
          const cached = await this.get(cid)
          if (!cached) {
            console.log(`Cache miss for ${cid}, will be fetched on demand`)
          }
        } catch (error) {
          console.warn(`Failed to warm cache for ${cid}:`, error)
        }
      })

      await Promise.allSettled(warmPromises)

      // Small delay between batches to avoid overwhelming the system
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Cache warming completed`)
  }

  async preloadPopularContent(): Promise<void> {
    console.log('📈 Preloading popular content...')

    try {
      if (this.useRedis && this.redis) {
        // Get popular content based on access frequency
        const popularKeys = await this.redis.keys('blob:*')

        // Sort by last access time or frequency if we track it
        const popularCids = popularKeys
          .slice(0, 20)
          .map((key) => key.replace('blob:', ''))

        await this.warmCache(popularCids)
      } else {
        // For memory cache, get existing keys
        const keys = this.memoryCache.keys()
        const popularCids = keys
          .filter((key) => key.startsWith('blob:'))
          .slice(0, 10)
          .map((key) => key.replace('blob:', ''))

        await this.warmCache(popularCids)
      }
    } catch (error) {
      console.warn('Failed to preload popular content:', error)
    }
  }

  async getMemoryPressure(): Promise<number> {
    if (this.useRedis && this.redis) {
      try {
        const info = await this.redis.info('memory')
        const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0')
        const maxMemory = parseInt(info.match(/maxmemory:(\d+)/)?.[1] || '0')

        if (maxMemory > 0) {
          return usedMemory / maxMemory
        }
      } catch (error) {
        console.warn('Failed to get Redis memory info:', error)
      }
    }

    const memStats = this.memoryCache.getStats()
    return memStats.keys / config.MAX_CACHE_SIZE
  }

  async evictLeastUsed(count: number = 10): Promise<void> {
    console.log(`🗑️ Evicting ${count} least used items...`)

    if (this.useRedis && this.redis) {
      try {
        // Get keys sorted by last access time
        const keys = await this.redis.keys('blob:*')
        const keysWithTTL = await Promise.all(
          keys.map(async (key) => ({
            key,
            ttl: await this.redis!.ttl(key),
          })),
        )

        // Sort by TTL (items with lower TTL are accessed less recently)
        const sortedKeys = keysWithTTL
          .sort((a, b) => a.ttl - b.ttl)
          .slice(0, count)
          .map((item) => item.key)

        if (sortedKeys.length > 0) {
          await this.redis.del(...sortedKeys)
          console.log(`✅ Evicted ${sortedKeys.length} items from Redis`)
        }
      } catch (error) {
        console.warn('Failed to evict from Redis:', error)
      }
    }

    // Also evict from memory cache
    const memKeys = this.memoryCache.keys()
    const blobKeys = memKeys
      .filter((key) => key.startsWith('blob:'))
      .slice(0, count)

    for (const key of blobKeys) {
      this.memoryCache.del(key)
    }

    console.log(`✅ Evicted ${blobKeys.length} items from memory cache`)
  }

  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect()
    }
  }
}

export const cacheService = new CacheService()
