import type { FastifyInstance } from 'fastify'
import { CacheController } from '../../controllers/cache.controller.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

export async function cacheRoutes(fastify: FastifyInstance) {
  const controller = new CacheController()

  // GET /v1/cache - List cache entries
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          starting_after: { type: 'string' },
          ending_before: { type: 'string' },
          pinned: { type: 'boolean' }
        }
      }
    }
  }, controller.list.bind(controller))

  // GET /v1/cache/stats - Get cache statistics
  fastify.get('/stats', controller.getStats.bind(controller))

  // GET /v1/cache/:id - Retrieve a cache entry
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

  // POST /v1/cache/preload - Preload blobs into cache
  fastify.post('/preload', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        properties: {
          blob_ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 100
          }
        },
        required: ['blob_ids']
      }
    }
  }, controller.preload.bind(controller))

  // POST /v1/cache/clear - Clear cache entries
  fastify.post('/clear', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        properties: {
          blob_ids: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 100
          }
        }
      }
    }
  }, controller.clear.bind(controller))

  // DELETE /v1/cache/:id - Delete a cache entry
  fastify.delete('/:id', {
    preHandler: requireAuth,
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, controller.delete.bind(controller))
}