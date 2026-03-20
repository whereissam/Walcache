import fs from 'node:fs'
import path from 'node:path'
import Redis from 'ioredis'
import NodeCache from 'node-cache'
import { config } from '../config/index.js'
import type { CacheStats, CachedBlob } from '../types/cache.js'

export interface ICacheService {
  initialize: () => Promise<void>
  get: (cid: string) => Promise<CachedBlob | null>
  set: (cid: string, blob: CachedBlob, ttl?: number) => Promise<void>
  pin: (cid: string) => Promise<void>
  unpin: (cid: string) => Promise<void>
  isPinned: (cid: string) => Promise<boolean>
  delete: (cid: string) => Promise<void>
  clear: () => Promise<void>
  getStats: () => Promise<CacheStats>
  healthCheck: () => Promise<{ status: string; using: string }>
  warmCache: (cids: Array<string>) => Promise<void>
  preloadPopularContent: () => Promise<void>
  getEpochAwareTTL: (requestedTTL?: number) => number
}

// Epoch tracking for Walrus storage alignment
interface EpochState {
  currentEpochStart: number
  epochDuration: number
}

// Persistence metadata stored alongside blob data
interface PersistedBlob {
  cid: string
  contentType: string
  size: number
  timestamp: string
  cached: string
  ttl: number
  pinned: boolean
  persistedAt: string
}

export class CacheService implements ICacheService {
  private redis: Redis | null = null
  private memoryCache: NodeCache
  private useRedis = true

  // Epoch tracking
  private epochState: EpochState

  // Persistence
  private persistenceDir: string
  private enablePersistence: boolean

  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: config.CACHE_TTL,
      maxKeys: config.MAX_CACHE_SIZE,
      checkperiod: 600,
      deleteOnExpire: true,
    })

    // Initialize epoch state
    this.epochState = {
      currentEpochStart: Date.now(),
      epochDuration: (config.WALRUS_EPOCH_DURATION || 86400) * 1000,
    }

    // Persistence config
    this.persistenceDir = config.CACHE_PERSISTENCE_DIR || './data/cache'
    this.enablePersistence = config.ENABLE_CACHE_PERSISTENCE ?? false
  }

  async initialize(): Promise<void> {
    // Initialize Redis
    try {
      this.redis = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        db: 0,
        keyPrefix: 'wcdn:',
      })

      this.redis.on('error', (error) => {
        console.warn('Redis connection error:', error.message)
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
      console.log('✅ Falling back to memory cache only')
    }

    // Initialize persistence directory
    if (this.enablePersistence) {
      await this.initPersistence()
    }

    // Sync epoch state from Walrus config
    this.syncEpochState()

    console.log(
      `⏱️  Epoch-aware TTL enabled (epoch duration: ${this.epochState.epochDuration / 1000}s)`,
    )
  }

  /**
   * Calculate epoch-aware TTL that aligns cache expiration with Walrus storage epochs.
   * Ensures cached content doesn't outlive its Walrus epoch availability.
   */
  getEpochAwareTTL(requestedTTL?: number): number {
    const baseTTL = requestedTTL || config.CACHE_TTL
    const now = Date.now()
    const elapsed = now - this.epochState.currentEpochStart
    const remainingInEpoch = Math.max(
      0,
      this.epochState.epochDuration - elapsed,
    )
    const remainingSeconds = Math.floor(remainingInEpoch / 1000)

    // If we're past the epoch, resync and recalculate
    if (remainingSeconds <= 0) {
      this.syncEpochState()
      return Math.min(
        baseTTL,
        Math.floor(this.epochState.epochDuration / 1000),
      )
    }

    // TTL is the minimum of requested TTL and remaining epoch time
    return Math.min(baseTTL, remainingSeconds)
  }

  private syncEpochState(): void {
    const now = Date.now()
    const epochDuration = this.epochState.epochDuration

    // Align to epoch boundaries
    this.epochState.currentEpochStart =
      now - (now % epochDuration)
  }

  async get(cid: string): Promise<CachedBlob | null> {
    const dataKey = `blob:data:${cid}`
    const metaKey = `blob:meta:${cid}`
    const legacyKey = `blob:${cid}`

    if (this.useRedis && this.redis) {
      try {
        // Try new split-key format first (binary data stored separately)
        const [metaRaw, dataRaw] = await Promise.all([
          this.redis.get(metaKey),
          this.redis.getBuffer(dataKey),
        ])

        if (metaRaw && dataRaw) {
          const meta = JSON.parse(metaRaw)
          if (typeof meta.timestamp === 'string') {
            meta.timestamp = new Date(meta.timestamp)
          }
          if (typeof meta.cached === 'string') {
            meta.cached = new Date(meta.cached)
          }
          return { ...meta, data: dataRaw }
        }

        // Fall back to legacy single-key format for backward compatibility
        const cached = await this.redis.get(legacyKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (
            parsed.data &&
            parsed.data.type === 'Buffer' &&
            Array.isArray(parsed.data.data)
          ) {
            parsed.data = Buffer.from(parsed.data.data)
          }
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

    const memResult = this.memoryCache.get<CachedBlob>(legacyKey) || null
    if (memResult) return memResult

    // Fall back to persistent storage for pinned blobs
    if (this.enablePersistence) {
      const persisted = await this.loadFromDisk(cid)
      if (persisted) {
        // Re-hydrate into memory cache
        this.memoryCache.set(legacyKey, persisted, persisted.pinned ? 0 : config.CACHE_TTL)
        return persisted
      }
    }

    return null
  }

  async set(cid: string, blob: CachedBlob, ttl?: number): Promise<void> {
    const dataKey = `blob:data:${cid}`
    const metaKey = `blob:meta:${cid}`
    const legacyKey = `blob:${cid}`

    // Use epoch-aware TTL unless explicitly overridden with 0 (pinned)
    const cacheTTL = ttl === 0 ? 0 : this.getEpochAwareTTL(ttl)

    if (this.useRedis && this.redis) {
      try {
        // Store metadata and binary data separately for efficiency
        const { data, ...meta } = blob
        const metaValue = JSON.stringify(meta)
        const blobData = Buffer.isBuffer(data) ? data : Buffer.from(data)

        const pipeline = this.redis.pipeline()
        // Remove legacy single-key entry if it exists
        pipeline.del(legacyKey)

        if (cacheTTL === 0) {
          pipeline.set(metaKey, metaValue)
          pipeline.set(dataKey, blobData)
        } else {
          pipeline.setex(metaKey, cacheTTL, metaValue)
          pipeline.setex(dataKey, cacheTTL, blobData)
        }

        await pipeline.exec()
      } catch (error) {
        console.warn('Redis set error, falling back to memory:', error)
      }
    }

    this.memoryCache.set(legacyKey, blob, cacheTTL)

    // Persist pinned blobs to disk
    if (this.enablePersistence && blob.pinned) {
      await this.persistToDisk(cid, blob)
    }
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
      cached.pinned = true
      this.memoryCache.set(key, cached, 0)

      // Persist pinned blob to disk
      if (this.enablePersistence) {
        await this.persistToDisk(cid, cached)
      }
    }
  }

  async unpin(cid: string): Promise<void> {
    const legacyKey = `blob:${cid}`
    const dataKey = `blob:data:${cid}`
    const metaKey = `blob:meta:${cid}`
    const pinKey = `pin:${cid}`
    const epochTTL = this.getEpochAwareTTL()

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(pinKey)
        // Expire both legacy and new keys
        await this.redis.expire(legacyKey, epochTTL)
        await this.redis.expire(dataKey, epochTTL)
        await this.redis.expire(metaKey, epochTTL)
      } catch (error) {
        console.warn('Redis unpin error:', error)
      }
    }

    const cached = this.memoryCache.get<CachedBlob>(legacyKey)
    if (cached) {
      cached.pinned = false
      this.memoryCache.set(legacyKey, cached, epochTTL)
    }

    // Remove from persistence
    if (this.enablePersistence) {
      await this.removeFromDisk(cid)
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

    // Check persistence directory
    if (this.enablePersistence) {
      const metaPath = path.join(this.persistenceDir, `${this.sanitizeCid(cid)}.meta.json`)
      return fs.existsSync(metaPath)
    }

    return false
  }

  async delete(cid: string): Promise<void> {
    const legacyKey = `blob:${cid}`
    const dataKey = `blob:data:${cid}`
    const metaKey = `blob:meta:${cid}`
    const pinKey = `pin:${cid}`

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(legacyKey, dataKey, metaKey, pinKey)
      } catch (error) {
        console.warn('Redis delete error:', error)
      }
    }

    this.memoryCache.del(legacyKey)

    // Remove from persistence
    if (this.enablePersistence) {
      await this.removeFromDisk(cid)
    }
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

    // Clear persistence directory (but not the directory itself)
    if (this.enablePersistence) {
      await this.clearDisk()
    }
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

    // Count persisted blobs
    let persistedCount = 0
    if (this.enablePersistence) {
      try {
        const files = fs.readdirSync(this.persistenceDir)
        persistedCount = files.filter((f) => f.endsWith('.meta.json')).length
      } catch {
        // Directory may not exist yet
      }
    }

    const memUsage = process.memoryUsage()

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
      epoch: {
        currentEpochStart: new Date(
          this.epochState.currentEpochStart,
        ).toISOString(),
        epochDurationSeconds: this.epochState.epochDuration / 1000,
        remainingSeconds: Math.max(
          0,
          Math.floor(
            (this.epochState.epochDuration -
              (Date.now() - this.epochState.currentEpochStart)) /
              1000,
          ),
        ),
      },
      persistence: {
        enabled: this.enablePersistence,
        persistedBlobs: persistedCount,
        directory: this.persistenceDir,
      },
      totalEntries: this.useRedis ? redisStats.keys : memoryStats.keys,
      totalSizeBytes: redisStats.memory || memUsage.heapUsed,
      pinnedEntries: persistedCount,
      memoryUsage: memUsage.heapUsed,
      redisConnected: this.useRedis && this.redis !== null,
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

  async warmCache(cids: Array<string>): Promise<void> {
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
        const popularKeys = await this.redis.keys('blob:*')
        const popularCids = popularKeys
          .slice(0, 20)
          .map((key) => key.replace('blob:', ''))

        await this.warmCache(popularCids)
      } else {
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
        const keys = await this.redis.keys('blob:*')
        const keysWithTTL = await Promise.all(
          keys.map(async (key) => ({
            key,
            ttl: await this.redis!.ttl(key),
          })),
        )

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

    const memKeys = this.memoryCache.keys()
    const blobKeys = memKeys
      .filter((key) => key.startsWith('blob:'))
      .slice(0, count)

    for (const key of blobKeys) {
      this.memoryCache.del(key)
    }

    console.log(`✅ Evicted ${blobKeys.length} items from memory cache`)
  }

  // --- Persistence layer for high-value blobs ---

  private async initPersistence(): Promise<void> {
    try {
      fs.mkdirSync(this.persistenceDir, { recursive: true })
      console.log(`💾 Cache persistence enabled at ${this.persistenceDir}`)

      // Restore pinned blobs from disk on startup
      await this.restoreFromDisk()
    } catch (error) {
      console.warn('Failed to initialize persistence directory:', error)
      this.enablePersistence = false
    }
  }

  private sanitizeCid(cid: string): string {
    return cid.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  private async persistToDisk(cid: string, blob: CachedBlob): Promise<void> {
    try {
      const safeCid = this.sanitizeCid(cid)
      const dataPath = path.join(this.persistenceDir, `${safeCid}.blob`)
      const metaPath = path.join(this.persistenceDir, `${safeCid}.meta.json`)

      const meta: PersistedBlob = {
        cid: blob.cid,
        contentType: blob.contentType,
        size: blob.size,
        timestamp: blob.timestamp.toISOString(),
        cached: blob.cached.toISOString(),
        ttl: blob.ttl,
        pinned: blob.pinned,
        persistedAt: new Date().toISOString(),
      }

      fs.writeFileSync(dataPath, blob.data)
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
    } catch (error) {
      console.warn(`Failed to persist blob ${cid} to disk:`, error)
    }
  }

  private async loadFromDisk(cid: string): Promise<CachedBlob | null> {
    try {
      const safeCid = this.sanitizeCid(cid)
      const dataPath = path.join(this.persistenceDir, `${safeCid}.blob`)
      const metaPath = path.join(this.persistenceDir, `${safeCid}.meta.json`)

      if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
        return null
      }

      const meta: PersistedBlob = JSON.parse(
        fs.readFileSync(metaPath, 'utf-8'),
      )
      const data = fs.readFileSync(dataPath)

      return {
        cid: meta.cid,
        data,
        contentType: meta.contentType,
        size: meta.size,
        timestamp: new Date(meta.timestamp),
        cached: new Date(meta.cached),
        ttl: meta.ttl,
        pinned: meta.pinned,
      }
    } catch (error) {
      console.warn(`Failed to load blob ${cid} from disk:`, error)
      return null
    }
  }

  private async removeFromDisk(cid: string): Promise<void> {
    try {
      const safeCid = this.sanitizeCid(cid)
      const dataPath = path.join(this.persistenceDir, `${safeCid}.blob`)
      const metaPath = path.join(this.persistenceDir, `${safeCid}.meta.json`)

      if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath)
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath)
    } catch (error) {
      console.warn(`Failed to remove blob ${cid} from disk:`, error)
    }
  }

  private async clearDisk(): Promise<void> {
    try {
      const files = fs.readdirSync(this.persistenceDir)
      for (const file of files) {
        fs.unlinkSync(path.join(this.persistenceDir, file))
      }
      console.log('💾 Persistence directory cleared')
    } catch (error) {
      console.warn('Failed to clear persistence directory:', error)
    }
  }

  private async restoreFromDisk(): Promise<void> {
    try {
      const files = fs.readdirSync(this.persistenceDir)
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'))
      let restored = 0

      for (const metaFile of metaFiles) {
        try {
          const metaPath = path.join(this.persistenceDir, metaFile)
          const meta: PersistedBlob = JSON.parse(
            fs.readFileSync(metaPath, 'utf-8'),
          )

          const safeCid = metaFile.replace('.meta.json', '')
          const dataPath = path.join(this.persistenceDir, `${safeCid}.blob`)

          if (!fs.existsSync(dataPath)) continue

          const data = fs.readFileSync(dataPath)
          const blob: CachedBlob = {
            cid: meta.cid,
            data,
            contentType: meta.contentType,
            size: meta.size,
            timestamp: new Date(meta.timestamp),
            cached: new Date(meta.cached),
            ttl: meta.ttl,
            pinned: meta.pinned,
          }

          const legacyKey = `blob:${meta.cid}`
          const dataKey = `blob:data:${meta.cid}`
          const metaKey = `blob:meta:${meta.cid}`
          this.memoryCache.set(legacyKey, blob, meta.pinned ? 0 : config.CACHE_TTL)

          // Also restore to Redis if available (using new split-key format)
          if (this.useRedis && this.redis) {
            const { data: blobData, ...blobMeta } = blob
            const metaValue = JSON.stringify(blobMeta)
            const pipeline = this.redis.pipeline()

            if (meta.pinned) {
              pipeline.set(metaKey, metaValue)
              pipeline.set(dataKey, Buffer.isBuffer(blobData) ? blobData : Buffer.from(blobData))
              pipeline.set(`pin:${meta.cid}`, '1')
            } else {
              pipeline.setex(metaKey, config.CACHE_TTL, metaValue)
              pipeline.setex(dataKey, config.CACHE_TTL, Buffer.isBuffer(blobData) ? blobData : Buffer.from(blobData))
            }

            await pipeline.exec()
          }

          restored++
        } catch (error) {
          console.warn(`Failed to restore blob from ${metaFile}:`, error)
        }
      }

      if (restored > 0) {
        console.log(`💾 Restored ${restored} persisted blobs from disk`)
      }
    } catch (error) {
      console.warn('Failed to restore blobs from disk:', error)
    }
  }

  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect()
    }
  }
}

export const cacheService = new CacheService()
