/**
 * Webhook Management API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebhookService, WebhookEvent } from '../services/webhook.js';

// Initialize webhook service (would be injected in real app)
const webhookService = new WebhookService();

interface WebhookEndpointBody {
  url: string;
  secret: string;
  events: WebhookEvent[];
  active?: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
}

export async function webhookRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // WEBHOOK ENDPOINT MANAGEMENT
  // =============================================================================

  // Create webhook endpoint
  fastify.post<{ Body: WebhookEndpointBody }>('/webhooks', async (request, reply) => {
    try {
      const endpoint = await webhookService.createEndpoint(request.body);
      
      return reply.status(201).send({
        success: true,
        data: endpoint,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // List webhook endpoints
  fastify.get('/webhooks', async (request, reply) => {
    try {
      const endpoints = webhookService.listEndpoints();
      
      return reply.send({
        success: true,
        data: endpoints,
        count: endpoints.length,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get specific webhook endpoint
  fastify.get<{ Params: { id: string } }>('/webhooks/:id', async (request, reply) => {
    try {
      const endpoint = webhookService.getEndpoint(request.params.id);
      
      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook endpoint not found',
        });
      }

      return reply.send({
        success: true,
        data: endpoint,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Update webhook endpoint
  fastify.patch<{ Params: { id: string }; Body: Partial<WebhookEndpointBody> }>(
    '/webhooks/:id', 
    async (request, reply) => {
      try {
        const endpoint = await webhookService.updateEndpoint(request.params.id, request.body);
        
        return reply.send({
          success: true,
          data: endpoint,
        });
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Delete webhook endpoint
  fastify.delete<{ Params: { id: string } }>('/webhooks/:id', async (request, reply) => {
    try {
      await webhookService.deleteEndpoint(request.params.id);
      
      return reply.send({
        success: true,
        message: 'Webhook endpoint deleted',
      });
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error.message,
      });
    }
  });

  // =============================================================================
  // WEBHOOK DELIVERIES AND STATS
  // =============================================================================

  // Get webhook delivery statistics
  fastify.get<{ Params: { id: string } }>('/webhooks/:id/stats', async (request, reply) => {
    try {
      const stats = webhookService.getDeliveryStats(request.params.id);
      
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get recent webhook deliveries
  fastify.get<{ 
    Params: { id: string }; 
    Querystring: { limit?: number } 
  }>('/webhooks/:id/deliveries', async (request, reply) => {
    try {
      const limit = request.query.limit || 50;
      const deliveries = webhookService.getRecentDeliveries(request.params.id, limit);
      
      return reply.send({
        success: true,
        data: deliveries,
        count: deliveries.length,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get global webhook statistics
  fastify.get('/webhooks/stats/global', async (request, reply) => {
    try {
      const stats = webhookService.getDeliveryStats();
      const endpoints = webhookService.listEndpoints();
      
      return reply.send({
        success: true,
        data: {
          endpoints: {
            total: endpoints.length,
            active: endpoints.filter(e => e.active).length,
            inactive: endpoints.filter(e => !e.active).length,
          },
          deliveries: stats,
        },
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // =============================================================================
  // WEBHOOK TESTING
  // =============================================================================

  // Test webhook endpoint
  fastify.post<{ 
    Params: { id: string }; 
    Body: { event: WebhookEvent; data: any } 
  }>('/webhooks/:id/test', async (request, reply) => {
    try {
      const endpoint = webhookService.getEndpoint(request.params.id);
      
      if (!endpoint) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook endpoint not found',
        });
      }

      // Send test webhook
      await webhookService.sendWebhook(request.body.event, {
        ...request.body.data,
        test: true,
        testTimestamp: new Date().toISOString(),
      });

      return reply.send({
        success: true,
        message: 'Test webhook sent',
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

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
    ];

    return reply.send({
      success: true,
      data: events,
      count: events.length,
    });
  });
}

// Export webhook service for use in other parts of the application
export { webhookService };