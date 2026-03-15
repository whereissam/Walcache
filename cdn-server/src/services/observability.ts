/**
 * Observability service — cost tracking, error monitoring, SLA, and per-token usage dashboards.
 */

import { config } from '../config/index.js'

// ─── Cost Tracking ───

export interface CostEntry {
  cid: string
  tokenId?: string
  bandwidthBytes: number
  cacheHit: boolean
  timestamp: Date
}

export interface CostSummary {
  totalBandwidthBytes: number
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  estimatedCostUSD: number
  period: { start: string; end: string }
  byBlob: Array<{
    cid: string
    bandwidthBytes: number
    requests: number
    estimatedCostUSD: number
  }>
}

// ─── Error Monitoring ───

export interface ErrorEntry {
  id: string
  type: string
  message: string
  endpoint: string
  statusCode: number
  timestamp: Date
  clientIP?: string
  metadata?: Record<string, unknown>
}

export interface ErrorSummary {
  total: number
  byType: Record<string, number>
  byEndpoint: Record<string, number>
  byStatusCode: Record<number, number>
  recentErrors: Array<ErrorEntry>
  errorRate: number
  period: { start: string; end: string }
}

// ─── SLA Monitoring ───

export interface HealthCheck {
  timestamp: Date
  healthy: boolean
  responseTimeMs: number
  components: {
    cache: boolean
    walrus: boolean
    aggregators: number
  }
}

export interface SLASummary {
  uptimePercent: number
  totalChecks: number
  healthyChecks: number
  avgResponseTimeMs: number
  p95ResponseTimeMs: number
  p99ResponseTimeMs: number
  incidents: Array<{ start: string; end: string; durationMs: number }>
  period: { start: string; end: string }
}

// ─── Per-Token Usage ───

export interface TokenUsageSummary {
  tokenId: string
  tokenName: string
  requests: number
  bandwidthBytes: number
  cacheHits: number
  cacheMisses: number
  errors: number
  estimatedCostUSD: number
  topBlobs: Array<{ cid: string; requests: number }>
  period: { start: string; end: string }
}

// ─── Pricing ───

const COST_PER_GB_BANDWIDTH = 0.05 // $0.05/GB
const COST_PER_CACHE_MISS = 0.0001 // $0.0001 per origin fetch

export class ObservabilityService {
  private costs: Array<CostEntry> = []
  private errors: Array<ErrorEntry> = []
  private healthChecks: Array<HealthCheck> = []
  private tokenUsage = new Map<string, Array<CostEntry>>()
  private tokenErrors = new Map<string, number>()
  private tokenNames = new Map<string, string>()
  private totalRequests = 0

  // ─── Cost Tracking ───

  recordCost(entry: CostEntry): void {
    this.costs.push(entry)
    this.totalRequests++

    if (entry.tokenId) {
      const tokenCosts = this.tokenUsage.get(entry.tokenId) || []
      tokenCosts.push(entry)
      this.tokenUsage.set(entry.tokenId, tokenCosts)
    }

    // Cleanup old entries (keep 7 days)
    if (this.costs.length > 100000) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      this.costs = this.costs.filter((c) => c.timestamp > cutoff)
    }
  }

  getCostSummary(periodHours = 24): CostSummary {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const entries = this.costs.filter((c) => c.timestamp > cutoff)

    const totalBandwidth = entries.reduce((s, e) => s + e.bandwidthBytes, 0)
    const hits = entries.filter((e) => e.cacheHit).length
    const misses = entries.filter((e) => !e.cacheHit).length
    const bandwidthCost = (totalBandwidth / (1024 * 1024 * 1024)) * COST_PER_GB_BANDWIDTH
    const missCost = misses * COST_PER_CACHE_MISS

    // Per-blob breakdown
    const blobMap = new Map<string, { bandwidth: number; requests: number }>()
    for (const entry of entries) {
      const existing = blobMap.get(entry.cid) || { bandwidth: 0, requests: 0 }
      existing.bandwidth += entry.bandwidthBytes
      existing.requests++
      blobMap.set(entry.cid, existing)
    }

    const byBlob = Array.from(blobMap.entries())
      .map(([cid, data]) => ({
        cid,
        bandwidthBytes: data.bandwidth,
        requests: data.requests,
        estimatedCostUSD:
          (data.bandwidth / (1024 * 1024 * 1024)) * COST_PER_GB_BANDWIDTH,
      }))
      .sort((a, b) => b.bandwidthBytes - a.bandwidthBytes)
      .slice(0, 20)

    return {
      totalBandwidthBytes: totalBandwidth,
      totalRequests: entries.length,
      cacheHits: hits,
      cacheMisses: misses,
      estimatedCostUSD: Math.round((bandwidthCost + missCost) * 10000) / 10000,
      period: {
        start: cutoff.toISOString(),
        end: new Date().toISOString(),
      },
      byBlob,
    }
  }

  // ─── Error Monitoring ───

  recordError(error: Omit<ErrorEntry, 'id'>): void {
    const entry: ErrorEntry = {
      ...error,
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }
    this.errors.push(entry)

    // Track per-token errors
    if (error.metadata?.tokenId) {
      const tokenId = error.metadata.tokenId as string
      this.tokenErrors.set(tokenId, (this.tokenErrors.get(tokenId) || 0) + 1)
    }

    // Cleanup (keep 24h)
    if (this.errors.length > 10000) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      this.errors = this.errors.filter((e) => e.timestamp > cutoff)
    }
  }

  getErrorSummary(periodHours = 24): ErrorSummary {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const entries = this.errors.filter((e) => e.timestamp > cutoff)

    const byType: Record<string, number> = {}
    const byEndpoint: Record<string, number> = {}
    const byStatusCode: Record<number, number> = {}

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1
      byEndpoint[entry.endpoint] = (byEndpoint[entry.endpoint] || 0) + 1
      byStatusCode[entry.statusCode] = (byStatusCode[entry.statusCode] || 0) + 1
    }

    const totalReqs = this.totalRequests || 1

    return {
      total: entries.length,
      byType,
      byEndpoint,
      byStatusCode,
      recentErrors: entries.slice(-20).reverse(),
      errorRate: Math.round((entries.length / totalReqs) * 10000) / 100,
      period: {
        start: cutoff.toISOString(),
        end: new Date().toISOString(),
      },
    }
  }

  // ─── SLA Monitoring ───

  recordHealthCheck(check: HealthCheck): void {
    this.healthChecks.push(check)

    // Keep 7 days of health checks
    if (this.healthChecks.length > 20000) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      this.healthChecks = this.healthChecks.filter((h) => h.timestamp > cutoff)
    }
  }

  getSLASummary(periodHours = 24): SLASummary {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const checks = this.healthChecks.filter((h) => h.timestamp > cutoff)

    if (checks.length === 0) {
      return {
        uptimePercent: 100,
        totalChecks: 0,
        healthyChecks: 0,
        avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        p99ResponseTimeMs: 0,
        incidents: [],
        period: { start: cutoff.toISOString(), end: new Date().toISOString() },
      }
    }

    const healthy = checks.filter((c) => c.healthy)
    const responseTimes = checks.map((c) => c.responseTimeMs).sort((a, b) => a - b)
    const avg = responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length

    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)

    // Detect incidents (consecutive unhealthy checks)
    const incidents: SLASummary['incidents'] = []
    let incidentStart: Date | null = null

    for (const check of checks) {
      if (!check.healthy && !incidentStart) {
        incidentStart = check.timestamp
      } else if (check.healthy && incidentStart) {
        incidents.push({
          start: incidentStart.toISOString(),
          end: check.timestamp.toISOString(),
          durationMs: check.timestamp.getTime() - incidentStart.getTime(),
        })
        incidentStart = null
      }
    }

    // If still in an incident
    if (incidentStart) {
      incidents.push({
        start: incidentStart.toISOString(),
        end: new Date().toISOString(),
        durationMs: Date.now() - incidentStart.getTime(),
      })
    }

    return {
      uptimePercent:
        Math.round((healthy.length / checks.length) * 10000) / 100,
      totalChecks: checks.length,
      healthyChecks: healthy.length,
      avgResponseTimeMs: Math.round(avg * 100) / 100,
      p95ResponseTimeMs: responseTimes[p95Index] || 0,
      p99ResponseTimeMs: responseTimes[p99Index] || 0,
      incidents,
      period: { start: cutoff.toISOString(), end: new Date().toISOString() },
    }
  }

  // ─── Per-Token Usage Dashboard ───

  setTokenName(tokenId: string, name: string): void {
    this.tokenNames.set(tokenId, name)
  }

  getTokenUsage(tokenId: string, periodHours = 24): TokenUsageSummary {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const entries = (this.tokenUsage.get(tokenId) || []).filter(
      (c) => c.timestamp > cutoff,
    )

    const bandwidth = entries.reduce((s, e) => s + e.bandwidthBytes, 0)
    const hits = entries.filter((e) => e.cacheHit).length
    const misses = entries.filter((e) => !e.cacheHit).length

    // Top blobs for this token
    const blobMap = new Map<string, number>()
    for (const entry of entries) {
      blobMap.set(entry.cid, (blobMap.get(entry.cid) || 0) + 1)
    }
    const topBlobs = Array.from(blobMap.entries())
      .map(([cid, requests]) => ({ cid, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    return {
      tokenId,
      tokenName: this.tokenNames.get(tokenId) || 'unknown',
      requests: entries.length,
      bandwidthBytes: bandwidth,
      cacheHits: hits,
      cacheMisses: misses,
      errors: this.tokenErrors.get(tokenId) || 0,
      estimatedCostUSD:
        Math.round(
          ((bandwidth / (1024 * 1024 * 1024)) * COST_PER_GB_BANDWIDTH +
            misses * COST_PER_CACHE_MISS) *
            10000,
        ) / 10000,
      topBlobs,
      period: { start: cutoff.toISOString(), end: new Date().toISOString() },
    }
  }

  getAllTokenUsage(periodHours = 24): Array<TokenUsageSummary> {
    const tokenIds = Array.from(this.tokenUsage.keys())
    return tokenIds.map((id) => this.getTokenUsage(id, periodHours))
  }
}

export const observabilityService = new ObservabilityService()
