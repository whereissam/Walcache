import type { FastifyRequest, FastifyReply } from 'fastify'
import { BaseController } from './base.controller.js'
import { analyticsService } from '../services/analytics.js'
import { cacheService } from '../services/cache.js'
import { metricsService } from '../services/metrics.js'
import type { AnalyticsResource, PaginationParams } from '../types/api.js'

interface AnalyticsParams {
  id: string
}

interface AnalyticsQueryParams extends PaginationParams {
  blob_id?: string
  period?: '1h' | '24h' | '7d' | '30d'
}

export class AnalyticsController extends BaseController {
  async retrieve(
    request: FastifyRequest<{ Params: AnalyticsParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    await this.handleAsync(async () => {
      // In this case, id is the blob_id for analytics
      const stats = analyticsService.getCIDStats(id)
      
      if (!stats || stats.totalRequests === 0) {
        this.sendNotFoundError(reply, 'Analytics', id)
        return
      }

      const analytics: AnalyticsResource = {
        id: `analytics_${id}`,
        object: 'analytics',
        created: this.getUnixTimestamp(),
        blob_id: id,
        total_requests: stats.totalRequests,
        cache_hits: stats.cacheHits,
        cache_misses: stats.cacheMisses,
        total_bytes_served: stats.totalBytesServed,
        last_accessed: this.getUnixTimestamp(stats.lastAccessed),
        geographic_stats: stats.geographic || {}
      }

      reply.send(analytics)
    }, reply)
  }

  async list(
    request: FastifyRequest<{ Querystring: AnalyticsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const params = this.parsePaginationParams(request.query)
      const { blob_id, period } = request.query

      let analyticsData: AnalyticsResource[] = []

      if (blob_id) {
        // Get analytics for specific blob
        const stats = analyticsService.getCIDStats(blob_id)
        if (stats && stats.totalRequests > 0) {
          analyticsData.push({
            id: `analytics_${blob_id}`,
            object: 'analytics',
            created: this.getUnixTimestamp(),
            blob_id,
            total_requests: stats.totalRequests,
            cache_hits: stats.cacheHits,
            cache_misses: stats.cacheMisses,
            total_bytes_served: stats.totalBytesServed,
            last_accessed: this.getUnixTimestamp(stats.lastAccessed),
            geographic_stats: stats.geographic || {}
          })
        }
      } else {
        // Get analytics for top CIDs
        const topCIDs = analyticsService.getTopCIDs(params.limit || 10)
        
        for (const cidStat of topCIDs) {
          const stats = analyticsService.getCIDStats(cidStat.cid)
          if (stats) {
            analyticsData.push({
              id: `analytics_${cidStat.cid}`,
              object: 'analytics',
              created: this.getUnixTimestamp(),
              blob_id: cidStat.cid,
              total_requests: stats.totalRequests,
              cache_hits: stats.cacheHits,
              cache_misses: stats.cacheMisses,
              total_bytes_served: stats.totalBytesServed,
              last_accessed: this.getUnixTimestamp(stats.lastAccessed),
              geographic_stats: stats.geographic || {}
            })
          }
        }
      }

      // Apply pagination
      if (params.starting_after) {
        const index = analyticsData.findIndex(a => a.id === params.starting_after)
        if (index >= 0) {
          analyticsData = analyticsData.slice(index + 1)
        }
      }

      if (params.ending_before) {
        const index = analyticsData.findIndex(a => a.id === params.ending_before)
        if (index >= 0) {
          analyticsData = analyticsData.slice(0, index)
        }
      }

      const limit = params.limit || 10
      const hasMore = analyticsData.length > limit
      const data = analyticsData.slice(0, limit)

      const response = this.createPaginatedResponse(
        data,
        '/v1/analytics',
        hasMore
      )

      reply.send(response)
    }, reply)
  }

  async getGlobal(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const globalStats = analyticsService.getGlobalStats()
      const cacheStats = await cacheService.getStats()
      const systemMetrics = metricsService.getSystemMetrics()
      const appMetrics = metricsService.getMetrics()

      const response = {
        object: 'global_analytics',
        created: this.getUnixTimestamp(),
        global: {
          total_requests: globalStats.totalRequests,
          cache_hits: globalStats.totalHits,
          cache_misses: globalStats.totalMisses,
          hit_rate: globalStats.globalHitRate,
          avg_latency: globalStats.avgLatency,
          unique_cids: globalStats.uniqueCIDs
        },
        cache: {
          total_entries: cacheStats.totalEntries,
          total_size: cacheStats.totalSizeBytes,
          pinned_entries: cacheStats.pinnedEntries,
          memory_usage: cacheStats.memoryUsage,
          redis_connected: cacheStats.redisConnected
        },
        geographic: analyticsService.getGeographicStats(),
        top_blobs: analyticsService.getTopCIDs(10),
        system: {
          memory_usage: systemMetrics.memoryUsage,
          cpu_usage: systemMetrics.cpuUsage,
          uptime: systemMetrics.uptime
        },
        application: {
          active_connections: appMetrics.activeConnections,
          requests_per_second: appMetrics.requestsPerSecond,
          error_rate: appMetrics.errorRate
        }
      }

      reply.send(response)
    }, reply)
  }

  async getPrometheus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const prometheusMetrics = metricsService.getPrometheusMetrics()
      reply.header('Content-Type', 'text/plain; version=0.0.4')
      reply.send(prometheusMetrics)
    }, reply)
  }
}