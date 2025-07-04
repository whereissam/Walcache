export interface CachedBlob {
  cid: string;
  data: Buffer;
  contentType: string;
  size: number;
  timestamp: Date;
  cached: Date;
  ttl: number;
  pinned: boolean;
}

export interface CacheStats {
  memory: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  redis: {
    keys: number;
    memory: number;
  };
  using: 'redis' | 'memory';
}