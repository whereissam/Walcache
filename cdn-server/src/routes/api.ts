import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { walrusService } from '../services/walrus.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import { metricsService } from '../services/metrics.js'
import {
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js'

const preloadSchema = z.object({
  cids: z.array(z.string().min(1)).min(1).max(100),
})

const pinSchema = z.object({
  cid: z.string().min(1),
})

const cacheInvalidateSchema = z.object({
  cids: z.array(z.string().min(1)).min(1).max(100),
})

interface CIDParams {
  cid: string
}

export async function apiRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/preload',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { cids } = preloadSchema.parse(request.body)

        const results = await Promise.allSettled(
          cids.map(async (cid) => {
            if (!walrusService.validateCID(cid)) {
              throw new Error(`Invalid CID format: ${cid}`)
            }

            const cached = await cacheService.get(cid)
            if (cached) {
              return { cid, status: 'already_cached' }
            }

            const blob = await walrusService.fetchBlob(cid)
            if (!blob) {
              throw new Error(`Blob not found: ${cid}`)
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

            await cacheService.set(cid, cachedBlob)
            return { cid, status: 'cached', size: blob.size }
          }),
        )

        analyticsService.recordPreload(cids)

        const successful = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value)
        const failed = results
          .filter((r) => r.status === 'rejected')
          .map((r) => ({
            error: r.reason.message,
          }))

        return reply.send({
          successful,
          failed,
          total: cids.length,
          cached: successful.length,
          errors: failed.length,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request format',
            details: error.errors,
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
        })
      }
    },
  )

  fastify.get<{ Params: CIDParams }>(
    '/stats/:cid',
    async (
      request: FastifyRequest<{ Params: CIDParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params

      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send({ error: 'Invalid CID format' })
      }

      const stats = analyticsService.getCIDStats(cid)
      const cached = await cacheService.get(cid)
      const pinned = await cacheService.isPinned(cid)

      return reply.send({
        cid,
        stats,
        cached: !!cached,
        pinned,
        cacheDate: cached?.cached,
        ttl: cached?.ttl,
      })
    },
  )

  fastify.post<{ Params: CIDParams }>(
    '/pin/:cid',
    { preHandler: requireAuth },
    async (
      request: AuthenticatedRequest<{ Params: CIDParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params

      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send({ error: 'Invalid CID format' })
      }

      try {
        const cached = await cacheService.get(cid)

        if (!cached) {
          const blob = await walrusService.fetchBlob(cid)
          if (!blob) {
            return reply.status(404).send({ error: 'Blob not found' })
          }

          const cachedBlob = {
            cid: blob.cid,
            data: blob.data,
            contentType: blob.contentType,
            size: blob.size,
            timestamp: blob.timestamp,
            cached: new Date(),
            ttl: 0,
            pinned: true,
          }

          await cacheService.set(cid, cachedBlob, 0)
        }

        await cacheService.pin(cid)
        analyticsService.recordPin(cid)

        return reply.send({
          cid,
          status: 'pinned',
          cached: true,
        })
      } catch (error) {
        fastify.log.error('Pin error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.delete<{ Params: CIDParams }>(
    '/pin/:cid',
    { preHandler: requireAuth },
    async (
      request: AuthenticatedRequest<{ Params: CIDParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params

      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send({ error: 'Invalid CID format' })
      }

      try {
        await cacheService.unpin(cid)
        analyticsService.recordUnpin(cid)

        return reply.send({
          cid,
          status: 'unpinned',
        })
      } catch (error) {
        fastify.log.error('Unpin error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  fastify.get(
    '/metrics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const globalStats = analyticsService.getGlobalStats()
      const cacheStats = await cacheService.getStats()
      const topCIDs = analyticsService.getTopCIDs(10)
      const systemMetrics = metricsService.getSystemMetrics()
      const appMetrics = metricsService.getMetrics()

      return reply.send({
        global: globalStats,
        cache: cacheStats,
        topCIDs,
        geographic: analyticsService.getGeographicStats(),
        system: systemMetrics,
        application: appMetrics,
      })
    },
  )

  // Prometheus metrics endpoint
  fastify.get(
    '/metrics/prometheus',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const prometheusMetrics = metricsService.getPrometheusMetrics()
      reply.header('Content-Type', 'text/plain; version=0.0.4')
      return reply.send(prometheusMetrics)
    },
  )

  // Detailed system metrics
  fastify.get(
    '/metrics/system',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const systemMetrics = metricsService.getSystemMetrics()
      return reply.send(systemMetrics)
    },
  )

  fastify.get(
    '/cache/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await cacheService.getStats()
      return reply.send(stats)
    },
  )

  fastify.post(
    '/cache/clear',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        await cacheService.clear()
        return reply.send({ status: 'cleared' })
      } catch (error) {
        fastify.log.error('Cache clear error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  // Delete specific cache entries
  fastify.delete<{ Params: CIDParams }>(
    '/cache/:cid',
    { preHandler: requireAuth },
    async (
      request: AuthenticatedRequest<{ Params: CIDParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params

      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send({ error: 'Invalid CID format' })
      }

      try {
        await cacheService.delete(cid)
        return reply.send({
          cid,
          status: 'deleted',
        })
      } catch (error) {
        fastify.log.error('Cache delete error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  // Bulk cache invalidation
  fastify.post(
    '/cache/invalidate',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { cids } = cacheInvalidateSchema.parse(request.body)

        const results = await Promise.allSettled(
          cids.map(async (cid) => {
            if (!walrusService.validateCID(cid)) {
              throw new Error(`Invalid CID format: ${cid}`)
            }
            await cacheService.delete(cid)
            return { cid, status: 'invalidated' }
          }),
        )

        const successful = results
          .filter(
            (
              result,
            ): result is PromiseFulfilledResult<{
              cid: string
              status: string
            }> => result.status === 'fulfilled',
          )
          .map((result) => result.value)

        const failed = results
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === 'rejected',
          )
          .map((result) => result.reason)

        return reply.send({
          successful,
          failed: failed.map((err) => err.message),
          total: cids.length,
          invalidated: successful.length,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation error',
            details: error.errors,
          })
        }

        fastify.log.error('Cache invalidate error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  // Webhook endpoint for automatic cache invalidation
  fastify.post(
    '/webhook/cache-invalidate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any

        // Validate webhook signature or API key here if needed

        if (body.type === 'file_deleted' || body.type === 'file_updated') {
          const { blobId, oldBlobId } = body

          // Invalidate old blob if file was updated
          if (oldBlobId) {
            await cacheService.delete(oldBlobId)
            fastify.log.info(`Cache invalidated for updated file: ${oldBlobId}`)
          }

          // For deleted files, invalidate current blob
          if (body.type === 'file_deleted' && blobId) {
            await cacheService.delete(blobId)
            fastify.log.info(`Cache invalidated for deleted file: ${blobId}`)
          }
        }

        return reply.send({ status: 'processed' })
      } catch (error) {
        fastify.log.error('Webhook cache invalidate error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )
}
