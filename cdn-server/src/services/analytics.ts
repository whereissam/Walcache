import { config } from '../config/index.js'
import type { AnalyticsEvent, CIDStats } from '../types/analytics.js'

export interface IAnalyticsService {
  initialize(): Promise<void>
  recordFetch(cid: string, hit: boolean, latency: number, size?: number, clientIP?: string, userAgent?: string): void
  recordPreload(cids: string[]): void
  recordPin(cid: string): void
  recordUnpin(cid: string): void
  getCIDStats(cid: string): CIDStats | null
  getTopCIDs(limit?: number): CIDStats[]
  getGlobalStats(): any
  getRecentEvents(limit?: number): AnalyticsEvent[]
  sendWebhook(event: AnalyticsEvent): Promise<void>
  getGeographicStats(): any[]
}

export class AnalyticsService implements IAnalyticsService {
  private stats: Map<string, CIDStats> = new Map()
  private events: AnalyticsEvent[] = []
  private enabled: boolean = config.ENABLE_ANALYTICS
  private geoStats: Map<string, number> = new Map()

  async initialize(): Promise<void> {
    if (!this.enabled) {
      console.log('📊 Analytics disabled')
      return
    }

    console.log('📊 Analytics service initialized')

    setInterval(() => {
      this.cleanupOldEvents()
    }, 60000)
  }

  recordFetch(
    cid: string,
    hit: boolean,
    latency: number,
    size?: number,
    clientIP?: string,
    userAgent?: string,
  ): void {
    if (!this.enabled) return

    const event: AnalyticsEvent = {
      type: 'fetch',
      cid,
      timestamp: new Date(),
      hit,
      latency,
      size,
      clientIP,
      userAgent,
    }

    this.events.push(event)
    this.updateCIDStats(cid, hit, latency, size)

    // Track geographic distribution
    if (clientIP) {
      const region = this.getRegionFromIP(clientIP)
      this.geoStats.set(region, (this.geoStats.get(region) || 0) + 1)
    }
  }

  recordPreload(cids: string[]): void {
    if (!this.enabled) return

    const event: AnalyticsEvent = {
      type: 'preload',
      cids,
      timestamp: new Date(),
    }

    this.events.push(event)
  }

  recordPin(cid: string): void {
    if (!this.enabled) return

    const event: AnalyticsEvent = {
      type: 'pin',
      cid,
      timestamp: new Date(),
    }

    this.events.push(event)
  }

  recordUnpin(cid: string): void {
    if (!this.enabled) return

    const event: AnalyticsEvent = {
      type: 'unpin',
      cid,
      timestamp: new Date(),
    }

    this.events.push(event)
  }

  private updateCIDStats(
    cid: string,
    hit: boolean,
    latency: number,
    size?: number,
  ): void {
    const existing = this.stats.get(cid)

    if (existing) {
      existing.requests++
      existing.hits += hit ? 1 : 0
      existing.misses += hit ? 0 : 1
      existing.hitRate = existing.hits / existing.requests
      existing.avgLatency =
        (existing.avgLatency * (existing.requests - 1) + latency) /
        existing.requests
      existing.lastAccess = new Date()
      if (size) existing.totalSize = (existing.totalSize || 0) + size
    } else {
      this.stats.set(cid, {
        cid,
        requests: 1,
        hits: hit ? 1 : 0,
        misses: hit ? 0 : 1,
        hitRate: hit ? 1 : 0,
        avgLatency: latency,
        firstAccess: new Date(),
        lastAccess: new Date(),
        totalSize: size || 0,
      })
    }
  }

  getCIDStats(cid: string): CIDStats | null {
    return this.stats.get(cid) || null
  }

  getTopCIDs(limit: number = 10): CIDStats[] {
    return Array.from(this.stats.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit)
  }

  getGlobalStats(): {
    totalRequests: number
    totalHits: number
    totalMisses: number
    globalHitRate: number
    avgLatency: number
    uniqueCIDs: number
  } {
    const stats = Array.from(this.stats.values())
    const totalRequests = stats.reduce((sum, s) => sum + s.requests, 0)
    const totalHits = stats.reduce((sum, s) => sum + s.hits, 0)
    const totalMisses = stats.reduce((sum, s) => sum + s.misses, 0)
    const avgLatency =
      stats.reduce((sum, s) => sum + s.avgLatency * s.requests, 0) /
        totalRequests || 0

    return {
      totalRequests,
      totalHits,
      totalMisses,
      globalHitRate: totalHits / totalRequests || 0,
      avgLatency,
      uniqueCIDs: stats.length,
    }
  }

  getRecentEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse()
  }

  private cleanupOldEvents(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    this.events = this.events.filter((event) => event.timestamp > oneDayAgo)
  }

  async sendWebhook(event: AnalyticsEvent): Promise<void> {
    if (!config.WEBHOOK_URL) return

    try {
      await fetch(config.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.warn('Webhook failed:', error)
    }
  }

  private getRegionFromIP(ip: string): string {
    // Simple IP-based region detection (in production, use a proper GeoIP service)
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.')
    ) {
      return 'Europe' // Default to Europe for local development (French user)
    }

    // Basic IP range detection (simplified)
    const firstOctet = parseInt(ip.split('.')[0] || '0')

    if (firstOctet >= 80 && firstOctet <= 95) return 'Europe'
    if (firstOctet >= 24 && firstOctet <= 50) return 'North America'
    if (firstOctet >= 110 && firstOctet <= 126) return 'Asia Pacific'

    return 'Europe' // Default to Europe for French deployment
  }

  getGeographicStats(): Array<{
    region: string
    requests: number
    percentage: number
  }> {
    const totalRequests = Array.from(this.geoStats.values()).reduce(
      (sum, count) => sum + count,
      0,
    )

    if (totalRequests === 0) {
      // Return default data for French deployment when no real data exists
      return [
        { region: 'Europe', requests: 0, percentage: 100 },
        { region: 'North America', requests: 0, percentage: 0 },
        { region: 'Asia Pacific', requests: 0, percentage: 0 },
        { region: 'Others', requests: 0, percentage: 0 },
      ]
    }

    const geoArray = Array.from(this.geoStats.entries()).map(
      ([region, requests]) => ({
        region,
        requests,
        percentage: Math.round((requests / totalRequests) * 100),
      }),
    )

    // Sort by requests (highest first)
    return geoArray.sort((a, b) => b.requests - a.requests)
  }

  async destroy(): Promise<void> {
    this.stats.clear()
    this.events.length = 0
    this.geoStats.clear()
  }
}

export const analyticsService = new AnalyticsService()
