import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../config/index.js', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 60,
    MAX_CACHE_SIZE: 10,
    WALRUS_EPOCH_DURATION: 300,
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
}))

import { ObservabilityService } from '../services/observability.js'

describe('ObservabilityService - Cost Tracking', () => {
  let service: ObservabilityService

  beforeEach(() => {
    service = new ObservabilityService()
  })

  it('should record and summarize costs', () => {
    service.recordCost({
      cid: 'blob-1',
      bandwidthBytes: 1024 * 1024, // 1MB
      cacheHit: true,
      timestamp: new Date(),
    })
    service.recordCost({
      cid: 'blob-2',
      bandwidthBytes: 5 * 1024 * 1024, // 5MB
      cacheHit: false,
      timestamp: new Date(),
    })

    const summary = service.getCostSummary(24)
    expect(summary.totalRequests).toBe(2)
    expect(summary.totalBandwidthBytes).toBe(6 * 1024 * 1024)
    expect(summary.cacheHits).toBe(1)
    expect(summary.cacheMisses).toBe(1)
    expect(summary.estimatedCostUSD).toBeGreaterThan(0)
  })

  it('should break down costs by blob', () => {
    for (let i = 0; i < 5; i++) {
      service.recordCost({
        cid: 'popular-blob',
        bandwidthBytes: 1024 * 1024,
        cacheHit: true,
        timestamp: new Date(),
      })
    }
    service.recordCost({
      cid: 'other-blob',
      bandwidthBytes: 512,
      cacheHit: false,
      timestamp: new Date(),
    })

    const summary = service.getCostSummary(24)
    expect(summary.byBlob.length).toBe(2)
    expect(summary.byBlob[0].cid).toBe('popular-blob')
    expect(summary.byBlob[0].requests).toBe(5)
  })

  it('should track per-token costs', () => {
    service.recordCost({
      cid: 'blob-1',
      tokenId: 'token-A',
      bandwidthBytes: 2048,
      cacheHit: true,
      timestamp: new Date(),
    })
    service.recordCost({
      cid: 'blob-2',
      tokenId: 'token-A',
      bandwidthBytes: 4096,
      cacheHit: false,
      timestamp: new Date(),
    })

    service.setTokenName('token-A', 'My App Token')
    const usage = service.getTokenUsage('token-A', 24)

    expect(usage.tokenId).toBe('token-A')
    expect(usage.tokenName).toBe('My App Token')
    expect(usage.requests).toBe(2)
    expect(usage.bandwidthBytes).toBe(6144)
    expect(usage.cacheHits).toBe(1)
    expect(usage.cacheMisses).toBe(1)
  })

  it('should return empty summary for no data', () => {
    const summary = service.getCostSummary(24)
    expect(summary.totalRequests).toBe(0)
    expect(summary.estimatedCostUSD).toBe(0)
  })
})

describe('ObservabilityService - Error Monitoring', () => {
  let service: ObservabilityService

  beforeEach(() => {
    service = new ObservabilityService()
  })

  it('should record and summarize errors', () => {
    service.recordError({
      type: 'WALRUS_FETCH_FAILED',
      message: 'Aggregator timeout',
      endpoint: '/cdn/:cid',
      statusCode: 504,
      timestamp: new Date(),
    })
    service.recordError({
      type: 'VALIDATION_ERROR',
      message: 'Invalid CID',
      endpoint: '/cdn/:cid',
      statusCode: 400,
      timestamp: new Date(),
    })

    const summary = service.getErrorSummary(24)
    expect(summary.total).toBe(2)
    expect(summary.byType['WALRUS_FETCH_FAILED']).toBe(1)
    expect(summary.byType['VALIDATION_ERROR']).toBe(1)
    expect(summary.byEndpoint['/cdn/:cid']).toBe(2)
    expect(summary.byStatusCode[504]).toBe(1)
    expect(summary.byStatusCode[400]).toBe(1)
    expect(summary.recentErrors.length).toBe(2)
  })

  it('should calculate error rate', () => {
    // Record some costs to set totalRequests
    service.recordCost({
      cid: 'x', bandwidthBytes: 0, cacheHit: true, timestamp: new Date(),
    })
    service.recordCost({
      cid: 'x', bandwidthBytes: 0, cacheHit: true, timestamp: new Date(),
    })

    service.recordError({
      type: 'ERROR', message: 'fail', endpoint: '/test',
      statusCode: 500, timestamp: new Date(),
    })

    const summary = service.getErrorSummary(24)
    expect(summary.errorRate).toBe(50) // 1 error / 2 requests = 50%
  })
})

describe('ObservabilityService - SLA Monitoring', () => {
  let service: ObservabilityService

  beforeEach(() => {
    service = new ObservabilityService()
  })

  it('should calculate uptime from health checks', () => {
    for (let i = 0; i < 10; i++) {
      service.recordHealthCheck({
        timestamp: new Date(Date.now() - (10 - i) * 60000),
        healthy: true,
        responseTimeMs: 50 + Math.random() * 100,
        components: { cache: true, walrus: true, aggregators: 5 },
      })
    }

    const sla = service.getSLASummary(24)
    expect(sla.uptimePercent).toBe(100)
    expect(sla.totalChecks).toBe(10)
    expect(sla.healthyChecks).toBe(10)
    expect(sla.incidents.length).toBe(0)
  })

  it('should detect incidents', () => {
    const now = Date.now()

    // Healthy
    service.recordHealthCheck({
      timestamp: new Date(now - 5 * 60000),
      healthy: true, responseTimeMs: 50,
      components: { cache: true, walrus: true, aggregators: 5 },
    })
    // Unhealthy
    service.recordHealthCheck({
      timestamp: new Date(now - 4 * 60000),
      healthy: false, responseTimeMs: 5000,
      components: { cache: true, walrus: false, aggregators: 0 },
    })
    service.recordHealthCheck({
      timestamp: new Date(now - 3 * 60000),
      healthy: false, responseTimeMs: 5000,
      components: { cache: true, walrus: false, aggregators: 0 },
    })
    // Recovered
    service.recordHealthCheck({
      timestamp: new Date(now - 2 * 60000),
      healthy: true, responseTimeMs: 80,
      components: { cache: true, walrus: true, aggregators: 3 },
    })

    const sla = service.getSLASummary(24)
    expect(sla.uptimePercent).toBe(50) // 2/4 healthy
    expect(sla.incidents.length).toBe(1)
    expect(sla.incidents[0].durationMs).toBeGreaterThan(0)
  })

  it('should calculate response time percentiles', () => {
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 500]
    for (const ms of times) {
      service.recordHealthCheck({
        timestamp: new Date(),
        healthy: true,
        responseTimeMs: ms,
        components: { cache: true, walrus: true, aggregators: 5 },
      })
    }

    const sla = service.getSLASummary(24)
    expect(sla.avgResponseTimeMs).toBeGreaterThan(0)
    expect(sla.p95ResponseTimeMs).toBeGreaterThanOrEqual(200)
    expect(sla.p99ResponseTimeMs).toBeGreaterThanOrEqual(200)
  })

  it('should return 100% uptime when no checks exist', () => {
    const sla = service.getSLASummary(24)
    expect(sla.uptimePercent).toBe(100)
    expect(sla.totalChecks).toBe(0)
  })
})

describe('ObservabilityService - Token Dashboard', () => {
  let service: ObservabilityService

  beforeEach(() => {
    service = new ObservabilityService()
  })

  it('should aggregate usage across all tokens', () => {
    service.setTokenName('t1', 'Frontend App')
    service.setTokenName('t2', 'Backend Service')

    service.recordCost({
      cid: 'b1', tokenId: 't1', bandwidthBytes: 1024,
      cacheHit: true, timestamp: new Date(),
    })
    service.recordCost({
      cid: 'b2', tokenId: 't2', bandwidthBytes: 2048,
      cacheHit: false, timestamp: new Date(),
    })

    const all = service.getAllTokenUsage(24)
    expect(all.length).toBe(2)

    const t1 = all.find((t) => t.tokenId === 't1')
    expect(t1!.tokenName).toBe('Frontend App')
    expect(t1!.requests).toBe(1)

    const t2 = all.find((t) => t.tokenId === 't2')
    expect(t2!.tokenName).toBe('Backend Service')
    expect(t2!.cacheMisses).toBe(1)
  })

  it('should track top blobs per token', () => {
    for (let i = 0; i < 10; i++) {
      service.recordCost({
        cid: 'hot-blob', tokenId: 't1', bandwidthBytes: 100,
        cacheHit: true, timestamp: new Date(),
      })
    }
    service.recordCost({
      cid: 'cold-blob', tokenId: 't1', bandwidthBytes: 50,
      cacheHit: false, timestamp: new Date(),
    })

    const usage = service.getTokenUsage('t1', 24)
    expect(usage.topBlobs[0].cid).toBe('hot-blob')
    expect(usage.topBlobs[0].requests).toBe(10)
  })

  it('should track errors per token', () => {
    service.recordError({
      type: 'FETCH_ERROR', message: 'fail', endpoint: '/cdn',
      statusCode: 500, timestamp: new Date(),
      metadata: { tokenId: 't1' },
    })
    service.recordError({
      type: 'FETCH_ERROR', message: 'fail', endpoint: '/cdn',
      statusCode: 500, timestamp: new Date(),
      metadata: { tokenId: 't1' },
    })

    const usage = service.getTokenUsage('t1', 24)
    expect(usage.errors).toBe(2)
  })
})
