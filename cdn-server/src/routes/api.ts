import { z } from 'zod'
import { walrusService } from '../services/walrus.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import { metricsService } from '../services/metrics.js'
import { endpointHealthService } from '../services/endpoint-health.js'
import { userService } from '../services/user.js'
import { signedUrlService } from '../services/signed-url.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { WebhookService } from '../services/webhook.js'
import { appConfig } from '../config/index.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

const preloadSchema = z.object({
  cids: z.array(z.string().min(1)).min(1).max(100),
})

const pinSchema = z.object({
  cid: z.string().min(1),
})

const webhookCacheInvalidateSchema = z.object({
  type: z.enum(['file_deleted', 'file_updated']),
  blobId: z.string().min(1).optional(),
  oldBlobId: z.string().min(1).optional(),
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
              ttl: cacheService.getEpochAwareTTL(),
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
    { preHandler: requireAuth },
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
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const prometheusMetrics = metricsService.getPrometheusMetrics()
      reply.header('Content-Type', 'text/plain; version=0.0.4')
      return reply.send(prometheusMetrics)
    },
  )

  // Detailed system metrics
  fastify.get(
    '/metrics/system',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const systemMetrics = metricsService.getSystemMetrics()
      return reply.send(systemMetrics)
    },
  )

  fastify.get(
    '/cache/stats',
    { preHandler: requireAuth },
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

  // Endpoint health status (public, no auth required)
  fastify.get(
    '/health/endpoints',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const healthStatus = endpointHealthService.getHealthStatus()
      return reply.send(healthStatus)
    },
  )

  // Pricing plans (public, no auth required)
  fastify.get(
    '/pricing',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const plans = userService.getSubscriptionPlans()
      return reply.send({
        plans: plans.map((plan) => ({
          tier: plan.tier,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billingPeriod: plan.billingPeriod,
          features: plan.features,
          limits: {
            requestsPerMinute: plan.limits.requestsPerMinute,
            requestsPerMonth: plan.limits.requestsPerMonth,
            bandwidthPerMonth: plan.limits.bandwidthPerMonth,
            maxStorageSize: plan.limits.maxStorageSize,
            maxUploadSize: plan.limits.maxUploadSize,
          },
        })),
      })
    },
  )

  // Signed URL generation (auth required)
  fastify.post(
    '/signed-url',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const schema = z.object({
          cid: z.string().min(1),
          expiresIn: z.number().min(60).max(86400 * 7).optional(),
          ip: z.string().ip().optional(),
          metadata: z.record(z.string()).optional(),
        })

        const body = schema.parse(request.body)

        if (!walrusService.validateCID(body.cid)) {
          return reply.status(400).send({ error: 'Invalid CID format' })
        }

        const baseUrl = `${request.protocol}://${request.hostname}`
        const token = signedUrlService.generateToken({
          cid: body.cid,
          expiresIn: body.expiresIn,
          ip: body.ip,
          metadata: body.metadata,
        })
        const signedUrl = signedUrlService.generateSignedUrl(baseUrl, {
          cid: body.cid,
          expiresIn: body.expiresIn,
          ip: body.ip,
          metadata: body.metadata,
        })

        return reply.send({
          cid: body.cid,
          token,
          signedUrl,
          expiresIn: body.expiresIn || 3600,
          expiresAt: new Date(
            Date.now() + (body.expiresIn || 3600) * 1000,
          ).toISOString(),
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: 'Validation error', details: error.errors })
        }
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )

  // Verify a signed URL token (public, no auth)
  fastify.get(
    '/signed-url/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, cid } = request.query as { token?: string; cid?: string }

      if (!token || !cid) {
        return reply
          .status(400)
          .send({ error: 'Missing token or cid query parameter' })
      }

      const clientIp = request.ip
      const result = signedUrlService.validateRequest(cid, token, clientIp)

      return reply.send(result)
    },
  )

  // Webhook endpoint for automatic cache invalidation
  fastify.post(
    '/webhook/cache-invalidate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if webhook secret is configured
        if (!appConfig.secrets.webhookSecret) {
          fastify.log.error(
            'Webhook secret not configured - rejecting webhook request',
          )
          return reply
            .status(401)
            .send({ error: 'Webhook authentication not configured' })
        }

        // Verify webhook signature
        const signature = request.headers['x-wcdn-signature'] as string
        if (!signature) {
          fastify.log.error('Missing webhook signature')
          return reply.status(401).send({ error: 'Missing webhook signature' })
        }

        const rawBody = JSON.stringify(request.body)
        let isValid = false

        try {
          isValid = WebhookService.verifySignature(
            rawBody,
            signature,
            appConfig.secrets.webhookSecret,
          )
        } catch (signatureError) {
          fastify.log.error(
            'Webhook signature verification failed:',
            signatureError,
          )
          return reply
            .status(401)
            .send({ error: 'Invalid webhook signature format' })
        }

        if (!isValid) {
          fastify.log.error('Invalid webhook signature')
          return reply.status(401).send({ error: 'Invalid webhook signature' })
        }

        // Validate request body
        const body = webhookCacheInvalidateSchema.parse(request.body)

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
        if (error instanceof z.ZodError) {
          fastify.log.error('Invalid webhook payload:', error.issues)
          return reply.status(400).send({ error: 'Invalid webhook payload' })
        }
        fastify.log.error('Webhook cache invalidate error:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )
}
