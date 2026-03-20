/**
 * Webhook Management API Routes
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import { WebhookService } from '../services/webhook.js'
import { requireAuth } from '../middleware/auth.js'
import type { FastifyInstance } from 'fastify'
import type { WebhookEvent } from '../services/webhook.js'

// Initialize webhook service (would be injected in real app)
const webhookService = new WebhookService()

// Validate webhook URL: must be HTTPS and not target private/internal networks
function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url)

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Webhook URL must use HTTPS' }
    }

    // Block private/internal hostnames
    const hostname = parsed.hostname.toLowerCase()
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
      /\.local$/,
      /\.internal$/,
    ]

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Webhook URL must not target private/internal networks' }
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

interface WebhookEndpointBody {
  url: string
  secret: string
  events: Array<WebhookEvent>
  active?: boolean
  headers?: Record<string, string>
  retryPolicy?: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
  }
  rateLimit?: {
    requests: number
    window: number
  }
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // =============================================================================
  // WEBHOOK ENDPOINT MANAGEMENT
  // =============================================================================

  // Create webhook endpoint
  fastify.post<{ Body: WebhookEndpointBody }>(
    '/webhooks',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        // Validate webhook URL
        const urlValidation = validateWebhookUrl(request.body.url)
        if (!urlValidation.valid) {
          return reply.status(400).send({
            success: false,
            error: urlValidation.error,
          })
        }

        const endpoint = await webhookService.createEndpoint(request.body)

        return reply.status(201).send({
          success: true,
          data: endpoint,
        })
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: (error as Error).message,
        })
      }
    },
  )

  // List webhook endpoints
  fastify.get('/webhooks', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const endpoints = webhookService.listEndpoints()

      return reply.send({
        success: true,
        data: endpoints,
        count: endpoints.length,
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: (error as Error).message,
      })
    }
  })

  // Get specific webhook endpoint
  fastify.get<{ Params: { id: string } }>(
    '/webhooks/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const endpoint = webhookService.getEndpoint(request.params.id)

        if (!endpoint) {
          return reply.status(404).send({
            success: false,
            error: 'Webhook endpoint not found',
          })
        }

        return reply.send({
          success: true,
          data: endpoint,
        })
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: (error as Error).message,
        })
      }
    },
  )

  // Update webhook endpoint
  fastify.patch<{ Params: { id: string }; Body: Partial<WebhookEndpointBody> }>(
    '/webhooks/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        // Validate URL if being updated
        if (request.body.url) {
          const urlValidation = validateWebhookUrl(request.body.url)
          if (!urlValidation.valid) {
            return reply.status(400).send({
              success: false,
              error: urlValidation.error,
            })
          }
        }

        const endpoint = await webhookService.updateEndpoint(
          request.params.id,
          request.body,
        )

        return reply.send({
          success: true,
          data: endpoint,
        })
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: (error as Error).message,
        })
      }
    },
  )

  // Delete webhook endpoint
  fastify.delete<{ Params: { id: string } }>(
    '/webhooks/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        await webhookService.deleteEndpoint(request.params.id)

        return reply.send({
          success: true,
          message: 'Webhook endpoint deleted',
        })
      } catch (error) {
        return reply.status(404).send({
          success: false,
          error: (error as Error).message,
        })
      }
    },
  )

  // =============================================================================
  // WEBHOOK DELIVERIES AND STATS
  // =============================================================================

  // Get webhook delivery statistics
  fastify.get<{ Params: { id: string } }>(
    '/webhooks/:id/stats',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const stats = webhookService.getDeliveryStats(request.params.id)

        return reply.send({
          success: true,
          data: stats,
        })
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: (error as Error).message,
        })
      }
    },
  )

  // Get recent webhook deliveries
  fastify.get<{
    Params: { id: string }
    Querystring: { limit?: number }
  }>('/webhooks/:id/deliveries', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const limit = request.query.limit || 50
      const deliveries = webhookService.getRecentDeliveries(
        request.params.id,
        limit,
      )

      return reply.send({
        success: true,
        data: deliveries,
        count: deliveries.length,
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: (error as Error).message,
      })
    }
  })

  // Get global webhook statistics
  fastify.get('/webhooks/stats/global', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const stats = webhookService.getDeliveryStats()
      const endpoints = webhookService.listEndpoints()

      return reply.send({
        success: true,
        data: {
          endpoints: {
            total: endpoints.length,
            active: endpoints.filter((e) => e.active).length,
            inactive: endpoints.filter((e) => !e.active).length,
          },
          deliveries: stats,
        },
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: (error as Error).message,
      })
    }
  })

  // =============================================================================
  // WEBHOOK TESTING
  // =============================================================================

  // Test webhook endpoint
  fastify.post<{
    Params: { id: string }
    Body: { event: WebhookEvent; data: any }
  }>('/webhooks/:id/test', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const endpoint = webhookService.getEndpoint(request.params.id)

      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook endpoint not found',
        })
      }

      // Send test webhook
      await webhookService.sendWebhook(request.body.event, {
        ...request.body.data,
        test: true,
        testTimestamp: new Date().toISOString(),
      })

      return reply.send({
        success: true,
        message: 'Test webhook sent',
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: (error as Error).message,
      })
    }
  })

  // =============================================================================
  // WEBHOOK EVENTS INFO
  // =============================================================================

  // Get available webhook events
  fastify.get('/webhooks/events', async (request, reply) => {
    const events = [
      {
        name: 'blob.uploaded',
        description: 'Triggered when a new blob is uploaded to WCDN',
        payload: {
          blobId: 'string',
          filename: 'string',
          size: 'number',
          contentType: 'string',
          uploader: 'string?',
          vaultId: 'string?',
          cdnUrl: 'string',
        },
      },
      {
        name: 'blob.cached',
        description: 'Triggered when a blob is cached in WCDN',
        payload: {
          blobId: 'string',
          size: 'number',
          ttl: 'number?',
          pinned: 'boolean',
        },
      },
      {
        name: 'blob.evicted',
        description: 'Triggered when a blob is evicted from cache',
        payload: {
          blobId: 'string',
          reason: 'ttl_expired | lru_eviction | manual_clear',
          cacheTime: 'number',
        },
      },
      {
        name: 'blob.pinned',
        description: 'Triggered when a blob is pinned in cache',
        payload: {
          blobId: 'string',
          operator: 'string',
        },
      },
      {
        name: 'blob.unpinned',
        description: 'Triggered when a blob is unpinned from cache',
        payload: {
          blobId: 'string',
          operator: 'string',
        },
      },
      {
        name: 'blob.verified',
        description: 'Triggered when a blob is verified on blockchain',
        payload: {
          blobId: 'string',
          chains: 'string[]',
          overallVerified: 'boolean',
          consensusLevel: 'string',
        },
      },
      {
        name: 'cache.cleared',
        description: 'Triggered when cache is cleared',
        payload: {
          type: 'full | partial',
          cleared: 'number',
          operator: 'string',
        },
      },
      {
        name: 'blockchain.registered',
        description: 'Triggered when blob metadata is registered on blockchain',
        payload: {
          blobId: 'string',
          chain: 'string',
          transactionHash: 'string',
          contractAddress: 'string?',
          uploader: 'string',
        },
      },
      {
        name: 'analytics.threshold',
        description: 'Triggered when analytics metrics exceed thresholds',
        payload: {
          metric: 'string',
          value: 'number',
          threshold: 'number',
          severity: 'warning | critical',
          blobId: 'string?',
        },
      },
    ]

    return reply.send({
      success: true,
      data: events,
      count: events.length,
    })
  })
}

// Export webhook service for use in other parts of the application
export { webhookService }
