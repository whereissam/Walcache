export interface AnalyticsEvent {
  type: 'fetch' | 'preload' | 'pin' | 'unpin' | 'download'
  cid?: string
  cids?: string[]
  timestamp: Date
  hit?: boolean
  latency?: number
  size?: number
  source?: string
  clientIP?: string
  userAgent?: string
}

export interface CIDStats {
  cid: string
  requests: number
  totalRequests: number
  hits: number
  cacheHits: number
  misses: number
  cacheMisses: number
  hitRate: number
  avgLatency: number
  firstAccess: Date
  lastAccess: Date
  lastAccessed: Date
  totalSize: number
  totalBytesServed: number
  geographic?: Record<string, number>
}
