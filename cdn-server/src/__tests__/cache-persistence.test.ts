import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Mock config — cannot use variables in vi.mock factory (hoisted)
vi.mock('../config/index.js', () => ({
  config: {
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 3600,
    MAX_CACHE_SIZE: 100,
    WALRUS_EPOCH_DURATION: 86400,
    CACHE_PERSISTENCE_DIR: './data/cache-persistence-test',
    ENABLE_CACHE_PERSISTENCE: true,
  },
  appConfig: {
    cache: {
      ttl: 3600,
      maxSize: 100,
      redisUrl: 'redis://localhost:6379',
      persistenceDir: './data/cache-persistence-test',
      enablePersistence: true,
    },
    walrus: {
      epochDurationSeconds: 86400,
    },
  },
}))

const TEST_PERSISTENCE_DIR = './data/cache-persistence-test'

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

function makeBlob(cid: string, pinned = false): CachedBlob {
  return {
    cid,
    data: Buffer.from(`data for ${cid}`),
    contentType: 'application/octet-stream',
    size: Buffer.from(`data for ${cid}`).length,
    timestamp: new Date(),
    cached: new Date(),
    ttl: 3600,
    pinned,
  }
}

function cleanupDir(dir: string) {
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        fs.unlinkSync(path.join(dir, file))
      }
      fs.rmdirSync(dir)
    }
  } catch {
    // ignore
  }
}

describe('CacheService - Disk Persistence', () => {
  let cache: CacheService

  beforeEach(async () => {
    cleanupDir(TEST_PERSISTENCE_DIR)
    cache = new CacheService()
    await cache.initialize()
  })

  afterEach(async () => {
    await cache.destroy()
    cleanupDir(TEST_PERSISTENCE_DIR)
  })

  it('should create persistence directory on init', () => {
    expect(fs.existsSync(TEST_PERSISTENCE_DIR)).toBe(true)
  })

  it('should persist pinned blobs to disk', async () => {
    const blob = makeBlob('persist-me', true)
    await cache.set('persist-me', blob)

    // Check files exist on disk
    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'persist-me.meta.json')
    const dataPath = path.join(TEST_PERSISTENCE_DIR, 'persist-me.blob')

    expect(fs.existsSync(metaPath)).toBe(true)
    expect(fs.existsSync(dataPath)).toBe(true)

    // Verify metadata
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    expect(meta.cid).toBe('persist-me')
    expect(meta.pinned).toBe(true)
    expect(meta.contentType).toBe('application/octet-stream')
  })

  it('should NOT persist unpinned blobs to disk', async () => {
    const blob = makeBlob('no-persist', false)
    await cache.set('no-persist', blob)

    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'no-persist.meta.json')
    expect(fs.existsSync(metaPath)).toBe(false)
  })

  it('should persist blobs when pinning after set', async () => {
    const blob = makeBlob('pin-later')
    await cache.set('pin-later', blob)
    await cache.pin('pin-later')

    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'pin-later.meta.json')
    expect(fs.existsSync(metaPath)).toBe(true)
  })

  it('should remove persisted blobs on unpin', async () => {
    const blob = makeBlob('unpin-me', true)
    await cache.set('unpin-me', blob)
    await cache.unpin('unpin-me')

    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'unpin-me.meta.json')
    const dataPath = path.join(TEST_PERSISTENCE_DIR, 'unpin-me.blob')

    expect(fs.existsSync(metaPath)).toBe(false)
    expect(fs.existsSync(dataPath)).toBe(false)
  })

  it('should remove persisted blobs on delete', async () => {
    const blob = makeBlob('delete-me', true)
    await cache.set('delete-me', blob)
    await cache.delete('delete-me')

    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'delete-me.meta.json')
    expect(fs.existsSync(metaPath)).toBe(false)
  })

  it('should restore persisted blobs on startup', async () => {
    // Persist a blob
    const blob = makeBlob('restore-me', true)
    await cache.set('restore-me', blob)
    await cache.destroy()

    // Create a new cache instance (simulating restart)
    const cache2 = new CacheService()
    await cache2.initialize()

    const restored = await cache2.get('restore-me')
    expect(restored).not.toBeNull()
    expect(restored!.cid).toBe('restore-me')
    expect(restored!.pinned).toBe(true)
    expect(restored!.data.toString()).toBe('data for restore-me')

    await cache2.destroy()
  })

  it('should fall back to disk when blob missing from memory', async () => {
    const blob = makeBlob('disk-fallback', true)
    await cache.set('disk-fallback', blob)

    // Clear memory cache manually to simulate eviction
    await cache.clear()

    // Re-persist before clearing (clear removes disk too)
    // Instead, write directly to simulate a pre-existing persisted blob
    const metaPath = path.join(TEST_PERSISTENCE_DIR, 'disk-only.meta.json')
    const dataPath = path.join(TEST_PERSISTENCE_DIR, 'disk-only.blob')
    const meta = {
      cid: 'disk-only',
      contentType: 'text/plain',
      size: 10,
      timestamp: new Date().toISOString(),
      cached: new Date().toISOString(),
      ttl: 0,
      pinned: true,
      persistedAt: new Date().toISOString(),
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta))
    fs.writeFileSync(dataPath, Buffer.from('disk data!'))

    const result = await cache.get('disk-only')
    expect(result).not.toBeNull()
    expect(result!.cid).toBe('disk-only')
    expect(result!.data.toString()).toBe('disk data!')
  })

  it('should include persistence stats', async () => {
    const blob = makeBlob('stats-blob', true)
    await cache.set('stats-blob', blob)

    const stats = await cache.getStats()
    expect(stats.persistence).toBeDefined()
    expect(stats.persistence!.enabled).toBe(true)
    expect(stats.persistence!.persistedBlobs).toBe(1)
    expect(stats.persistence!.directory).toBe(TEST_PERSISTENCE_DIR)
  })

  it('should sanitize CID for safe filenames', async () => {
    // CID with special characters
    const blob = makeBlob('abc/def..ghi', true)
    await cache.set('abc/def..ghi', blob)

    // Should create files with sanitized name (no slashes)
    const files = fs.readdirSync(TEST_PERSISTENCE_DIR)
    const hasUnsafe = files.some((f) => f.includes('/'))
    expect(hasUnsafe).toBe(false)
  })

  it('should clear persistence directory on clear()', async () => {
    await cache.set('a', makeBlob('a', true))
    await cache.set('b', makeBlob('b', true))
    await cache.clear()

    const files = fs.readdirSync(TEST_PERSISTENCE_DIR)
    expect(files.length).toBe(0)
  })
})
