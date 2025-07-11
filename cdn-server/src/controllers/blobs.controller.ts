import type { FastifyRequest, FastifyReply } from 'fastify'
import { BaseController } from './base.controller.js'
import { walrusService } from '../services/walrus.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import type { BlobResource, PaginationParams } from '../types/api.js'

interface BlobParams {
  id: string
}

interface BlobQueryParams extends PaginationParams {
  cached?: boolean
  pinned?: boolean
}

export class BlobsController extends BaseController {
  async retrieve(
    request: FastifyRequest<{ Params: BlobParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    if (!walrusService.validateCID(id)) {
      this.sendValidationError(reply, 'Invalid blob ID format', 'id')
      return
    }

    await this.handleAsync(async () => {
      const stats = analyticsService.getCIDStats(id)
      const cached = await cacheService.get(id)
      const pinned = await cacheService.isPinned(id)

      const blob: BlobResource = {
        id,
        object: 'blob',
        created: this.getUnixTimestamp(cached?.timestamp),
        cid: id,
        size: cached?.size || 0,
        content_type: cached?.contentType || 'application/octet-stream',
        cached: !!cached,
        pinned,
        cache_date: cached ? this.getUnixTimestamp(cached.cached) : undefined,
        ttl: cached?.ttl,
        source: cached ? 'cache' : 'walrus'
      }

      reply.send(blob)
    }, reply)
  }

  async list(
    request: FastifyRequest<{ Querystring: BlobQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const params = this.parsePaginationParams(request.query)
      const { cached, pinned } = request.query

      // Get cache stats for all cached blobs
      const cacheStats = await cacheService.getStats()
      const topCIDs = analyticsService.getTopCIDs(params.limit || 10)

      // Filter and transform to BlobResource format
      let blobs: BlobResource[] = []

      for (const cidStat of topCIDs) {
        const cachedBlob = await cacheService.get(cidStat.cid)
        const isPinned = await cacheService.isPinned(cidStat.cid)

        // Apply filters
        if (cached !== undefined && cached !== !!cachedBlob) continue
        if (pinned !== undefined && pinned !== isPinned) continue

        const blob: BlobResource = {
          id: cidStat.cid,
          object: 'blob',
          created: this.getUnixTimestamp(cachedBlob?.timestamp),
          cid: cidStat.cid,
          size: cachedBlob?.size || 0,
          content_type: cachedBlob?.contentType || 'application/octet-stream',
          cached: !!cachedBlob,
          pinned: isPinned,
          cache_date: cachedBlob ? this.getUnixTimestamp(cachedBlob.cached) : undefined,
          ttl: cachedBlob?.ttl
        }

        blobs.push(blob)
      }

      // Apply pagination
      if (params.starting_after) {
        const index = blobs.findIndex(b => b.id === params.starting_after)
        if (index >= 0) {
          blobs = blobs.slice(index + 1)
        }
      }

      if (params.ending_before) {
        const index = blobs.findIndex(b => b.id === params.ending_before)
        if (index >= 0) {
          blobs = blobs.slice(0, index)
        }
      }

      const limit = params.limit || 10
      const hasMore = blobs.length > limit
      const data = blobs.slice(0, limit)

      const response = this.createPaginatedResponse(
        data,
        '/v1/blobs',
        hasMore
      )

      reply.send(response)
    }, reply)
  }

  async pin(
    request: FastifyRequest<{ Params: BlobParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    if (!walrusService.validateCID(id)) {
      this.sendValidationError(reply, 'Invalid blob ID format', 'id')
      return
    }

    await this.handleAsync(async () => {
      // Check if blob exists
      let cached = await cacheService.get(id)

      if (!cached) {
        // Try to fetch and cache the blob first
        const blob = await walrusService.fetchBlob(id)
        if (!blob) {
          this.sendNotFoundError(reply, 'Blob', id)
          return
        }

        const cachedBlob = {
          cid: blob.cid,
          data: blob.data,
          contentType: blob.contentType,
          size: blob.size,
          timestamp: blob.timestamp,
          cached: new Date(),
          ttl: 0, // Pinned items don't expire
          pinned: true,
        }

        await cacheService.set(id, cachedBlob, 0)
        cached = cachedBlob
      } else {
        // Pin existing cached blob
        await cacheService.pin(id)
      }

      analyticsService.recordPin(id)

      const blob: BlobResource = {
        id,
        object: 'blob',
        created: this.getUnixTimestamp(cached.timestamp),
        cid: id,
        size: cached.size,
        content_type: cached.contentType,
        cached: true,
        pinned: true,
        cache_date: this.getUnixTimestamp(cached.cached),
        ttl: 0
      }

      reply.send(blob)
    }, reply)
  }

  async unpin(
    request: FastifyRequest<{ Params: BlobParams }>,
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
        this.sendNotFoundError(reply, 'Blob', id)
        return
      }

      await cacheService.unpin(id)
      analyticsService.recordUnpin(id)

      const blob: BlobResource = {
        id,
        object: 'blob',
        created: this.getUnixTimestamp(cached.timestamp),
        cid: id,
        size: cached.size,
        content_type: cached.contentType,
        cached: true,
        pinned: false,
        cache_date: this.getUnixTimestamp(cached.cached),
        ttl: cached.ttl
      }

      reply.send(blob)
    }, reply)
  }

  async delete(
    request: FastifyRequest<{ Params: BlobParams }>,
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
        this.sendNotFoundError(reply, 'Blob', id)
        return
      }

      await cacheService.delete(id)

      const blob: BlobResource = {
        id,
        object: 'blob',
        created: this.getUnixTimestamp(cached.timestamp),
        cid: id,
        size: cached.size,
        content_type: cached.contentType,
        cached: false,
        pinned: false
      }

      reply.send(blob)
    }, reply)
  }
}