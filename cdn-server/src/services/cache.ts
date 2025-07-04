import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { config } from '../config/index.js';
import type { CachedBlob, CacheStats } from '../types/cache.js';

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: NodeCache;
  private useRedis: boolean = true;

  constructor() {
    this.memoryCache = new NodeCache({
      stdTTL: config.CACHE_TTL,
      maxKeys: config.MAX_CACHE_SIZE,
      checkperiod: 600,
      deleteOnExpire: true
    });
  }

  async initialize(): Promise<void> {
    try {
      this.redis = new Redis(config.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000
      });

      // Suppress Redis error events after we've failed to connect
      this.redis.on('error', () => {
        // Silent - we handle this in the catch block
      });

      await this.redis.connect();
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.warn('⚠️  Redis unavailable, falling back to memory cache');
      this.useRedis = false;
      if (this.redis) {
        this.redis.disconnect();
        this.redis = null;
      }
    }
  }

  async get(cid: string): Promise<CachedBlob | null> {
    const key = `blob:${cid}`;
    
    if (this.useRedis && this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis get error, falling back to memory:', error);
      }
    }

    return this.memoryCache.get<CachedBlob>(key) || null;
  }

  async set(cid: string, blob: CachedBlob, ttl?: number): Promise<void> {
    const key = `blob:${cid}`;
    const value = JSON.stringify(blob);
    const cacheTTL = ttl || config.CACHE_TTL;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(key, cacheTTL, value);
      } catch (error) {
        console.warn('Redis set error, falling back to memory:', error);
      }
    }

    this.memoryCache.set(key, blob, cacheTTL);
  }

  async pin(cid: string): Promise<void> {
    const key = `blob:${cid}`;
    const pinKey = `pin:${cid}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.set(pinKey, '1');
        await this.redis.persist(key);
      } catch (error) {
        console.warn('Redis pin error:', error);
      }
    }

    const cached = this.memoryCache.get<CachedBlob>(key);
    if (cached) {
      this.memoryCache.set(key, cached, 0);
    }
  }

  async unpin(cid: string): Promise<void> {
    const key = `blob:${cid}`;
    const pinKey = `pin:${cid}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(pinKey);
        await this.redis.expire(key, config.CACHE_TTL);
      } catch (error) {
        console.warn('Redis unpin error:', error);
      }
    }

    const cached = this.memoryCache.get<CachedBlob>(key);
    if (cached) {
      this.memoryCache.set(key, cached, config.CACHE_TTL);
    }
  }

  async isPinned(cid: string): Promise<boolean> {
    const pinKey = `pin:${cid}`;

    if (this.useRedis && this.redis) {
      try {
        const pinned = await this.redis.get(pinKey);
        return pinned === '1';
      } catch (error) {
        console.warn('Redis isPinned error:', error);
      }
    }

    return false;
  }

  async delete(cid: string): Promise<void> {
    const key = `blob:${cid}`;
    const pinKey = `pin:${cid}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key, pinKey);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    }

    this.memoryCache.del(key);
  }

  async clear(): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn('Redis clear error:', error);
      }
    }

    this.memoryCache.flushAll();
  }

  async getStats(): Promise<CacheStats> {
    const memoryStats = this.memoryCache.getStats();
    
    let redisStats = { keys: 0, memory: 0 };
    if (this.useRedis && this.redis) {
      try {
        const info = await this.redis.info('memory');
        const dbsize = await this.redis.dbsize();
        redisStats = {
          keys: dbsize,
          memory: parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0')
        };
      } catch (error) {
        console.warn('Redis stats error:', error);
      }
    }

    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0
      },
      redis: redisStats,
      using: this.useRedis ? 'redis' : 'memory'
    };
  }

  async healthCheck(): Promise<{ status: string; using: string }> {
    const using = this.useRedis ? 'redis' : 'memory';
    
    if (this.useRedis && this.redis) {
      try {
        await this.redis.ping();
        return { status: 'healthy', using };
      } catch {
        return { status: 'degraded', using: 'memory' };
      }
    }

    return { status: 'healthy', using };
  }
}

export const cacheService = new CacheService();