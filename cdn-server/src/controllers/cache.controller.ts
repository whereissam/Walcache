import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { BaseController } from './base.controller.js'
import { cacheService } from '../services/cache.js'
import { walrusService } from '../services/walrus.js'
import { analyticsService } from '../services/analytics.js'
import type { CacheResource, PaginationParams } from '../types/api.js'

const preloadSchema = z.object({
  blob_ids: z.array(z.string().min(1)).min(1).max(100),
})

const clearSchema = z.object({
  blob_ids: z.array(z.string().min(1)).min(1).max(100).optional(),
})

interface CacheParams {
  id: string
}

interface CacheQueryParams extends PaginationParams {
  pinned?: boolean
}

export class CacheController extends BaseController {
  async retrieve(
    request: FastifyRequest<{ Params: CacheParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    if (!walrusService.validateCID(id)) {
      this.sendValidationError(reply, 'Invalid blob ID format', 'id')
      return
    }

    await this.handleAsync(async () => {
      const cached = await cacheService.get(id)
      if (!cached) {
        this.sendNotFoundError(reply, 'Cache entry', id)
        return
      }

      const pinned = await cacheService.isPinned(id)
      const expiresAt = cached.ttl > 0 
        ? this.getUnixTimestamp(cached.cached) + cached.ttl
        : 0

      const cacheEntry: CacheResource = {
        id: `cache_${id}`,
        object: 'cache',
        created: this.getUnixTimestamp(cached.cached),
        blob_id: id,
        size: cached.size,
        pinned,
        ttl: cached.ttl,
        expires_at: expiresAt,
        last_accessed: this.getUnixTimestamp(cached.cached)
      }

      reply.send(cacheEntry)
    }, reply)
  }

  async list(
    request: FastifyRequest<{ Querystring: CacheQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const params = this.parsePaginationParams(request.query)
      const { pinned } = request.query

      const cacheStats = await cacheService.getStats()
      const topCIDs = analyticsService.getTopCIDs(params.limit || 10)

      let cacheEntries: CacheResource[] = []

      for (const cidStat of topCIDs) {
        const cached = await cacheService.get(cidStat.cid)
        if (!cached) continue

        const isPinned = await cacheService.isPinned(cidStat.cid)
        
        // Apply pinned filter
        if (pinned !== undefined && pinned !== isPinned) continue

        const expiresAt = cached.ttl > 0 
          ? this.getUnixTimestamp(cached.cached) + cached.ttl
          : 0

        cacheEntries.push({
          id: `cache_${cidStat.cid}`,
          object: 'cache',
          created: this.getUnixTimestamp(cached.cached),
          blob_id: cidStat.cid,
          size: cached.size,
          pinned: isPinned,
          ttl: cached.ttl,
          expires_at: expiresAt,
          last_accessed: this.getUnixTimestamp(cached.cached)
        })
      }

      // Apply pagination
      if (params.starting_after) {
        const index = cacheEntries.findIndex(c => c.id === params.starting_after)
        if (index >= 0) {
          cacheEntries = cacheEntries.slice(index + 1)
        }
      }

      if (params.ending_before) {
        const index = cacheEntries.findIndex(c => c.id === params.ending_before)
        if (index >= 0) {
          cacheEntries = cacheEntries.slice(0, index)
        }
      }

      const limit = params.limit || 10
      const hasMore = cacheEntries.length > limit
      const data = cacheEntries.slice(0, limit)

      const response = this.createPaginatedResponse(
        data,
        '/v1/cache',
        hasMore
      )

      reply.send(response)
    }, reply)
  }

  async preload(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const { blob_ids } = preloadSchema.parse(request.body)

      const results = await Promise.allSettled(
        blob_ids.map(async (blobId) => {
          if (!walrusService.validateCID(blobId)) {
            throw new Error(`Invalid blob ID format: ${blobId}`)
          }

          const cached = await cacheService.get(blobId)
          if (cached) {
            return { blob_id: blobId, status: 'already_cached' }
          }

          const blob = await walrusService.fetchBlob(blobId)
          if (!blob) {
            throw new Error(`Blob not found: ${blobId}`)
          }

          const cachedBlob = {
            cid: blob.cid,
            data: blob.data,
            contentType: blob.contentType,
            size: blob.size,
            timestamp: blob.timestamp,
            cached: new Date(),
            ttl: 3600,
            pinned: false,
          }

          await cacheService.set(blobId, cachedBlob)
          return { blob_id: blobId, status: 'cached', size: blob.size }
        })
      )

      analyticsService.recordPreload(blob_ids)

      const successful = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
      const failed = results
        .filter((r) => r.status === 'rejected')
        .map((r) => ({
          blob_id: 'unknown',
          error: r.reason.message,
        }))

      const response = {
        object: 'preload_result',
        successful,
        failed,
        total: blob_ids.length,
        cached: successful.length,
        errors: failed.length,
      }

      reply.send(response)
    }, reply, 'Preload operation failed')
  }

  async clear(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const body = request.body as any
      const { blob_ids } = clearSchema.parse(body)

      if (blob_ids && blob_ids.length > 0) {
        // Clear specific blobs
        const results = await Promise.allSettled(
          blob_ids.map(async (blobId) => {
            if (!walrusService.validateCID(blobId)) {
              throw new Error(`Invalid blob ID format: ${blobId}`)
            }
            await cacheService.delete(blobId)
            return { blob_id: blobId, status: 'cleared' }
          })
        )

        const successful = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value)
        const failed = results
          .filter((r) => r.status === 'rejected')
          .map((r) => ({
            blob_id: 'unknown',
            error: r.reason.message,
          }))

        reply.send({
          object: 'clear_result',
          successful,
          failed,
          total: blob_ids.length,
          cleared: successful.length,
        })
      } else {
        // Clear entire cache
        await cacheService.clear()
        reply.send({
          object: 'clear_result',
          status: 'all_cleared',
          message: 'Entire cache cleared successfully'
        })
      }
    }, reply, 'Cache clear operation failed')
  }

  async delete(
    request: FastifyRequest<{ Params: CacheParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    if (!walrusService.validateCID(id)) {
      this.sendValidationError(reply, 'Invalid blob ID format', 'id')
      return
    }

    await this.handleAsync(async () => {
      const cached = await cacheService.get(id)
      if (!cached) {
        this.sendNotFoundError(reply, 'Cache entry', id)
        return
      }

      await cacheService.delete(id)

      const response = {
        object: 'cache_deletion',
        blob_id: id,
        status: 'deleted',
        message: 'Cache entry deleted successfully'
      }

      reply.send(response)
    }, reply)
  }

  async getStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const stats = await cacheService.getStats()
      
      const response = {
        object: 'cache_stats',
        created: this.getUnixTimestamp(),
        total_entries: stats.totalEntries,
        total_size_bytes: stats.totalSizeBytes,
        pinned_entries: stats.pinnedEntries,
        memory_usage_mb: Math.round(stats.memoryUsage / (1024 * 1024)),
        redis_connected: stats.redisConnected,
        hit_rate: stats.totalEntries > 0 ? 
          (stats.totalEntries / (stats.totalEntries + 1)) * 100 : 0
      }

      reply.send(response)
    }, reply)
  }
}