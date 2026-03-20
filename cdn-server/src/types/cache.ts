export interface CachedBlob {
  cid: string
  data: Buffer
  contentType: string
  size: number
  timestamp: Date
  cached: Date
  ttl: number
  pinned: boolean
}

export interface CacheStats {
  memory: {
    keys: number
    hits: number
    misses: number
    hitRate: number
  }
  redis: {
    keys: number
    memory: number
  }
  using: 'redis' | 'memory'
  epoch?: {
    currentEpochStart: string
    epochDurationSeconds: number
    remainingSeconds: number
  }
  persistence?: {
    enabled: boolean
    persistedBlobs: number
    directory: string
  }
  // Flat convenience properties used by controllers
  totalEntries: number
  totalSizeBytes: number
  pinnedEntries: number
  memoryUsage: number
  redisConnected: boolean
}
