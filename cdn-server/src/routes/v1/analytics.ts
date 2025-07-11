import type { FastifyInstance } from 'fastify'
import { AnalyticsController } from '../../controllers/analytics.controller.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

export async function analyticsRoutes(fastify: FastifyInstance) {
  const controller = new AnalyticsController()

  // GET /v1/analytics - List analytics data
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          starting_after: { type: 'string' },
          ending_before: { type: 'string' },
          blob_id: { type: 'string' },
          period: { type: 'string', enum: ['1h', '24h', '7d', '30d'] }
        }
      }
    }
  }, controller.list.bind(controller))

  // GET /v1/analytics/global - Get global analytics
  fastify.get('/global', controller.getGlobal.bind(controller))

  // GET /v1/analytics/prometheus - Get Prometheus metrics
  fastify.get('/prometheus', controller.getPrometheus.bind(controller))

  // GET /v1/analytics/:id - Retrieve analytics for specific blob
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.retrieve.bind(controller))
}