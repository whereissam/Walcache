import type { FastifyInstance } from 'fastify'
import { BlobsController } from '../../controllers/blobs.controller.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

export async function blobRoutes(fastify: FastifyInstance) {
  const controller = new BlobsController()

  // GET /v1/blobs - List blobs
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          starting_after: { type: 'string' },
          ending_before: { type: 'string' },
          cached: { type: 'boolean' },
          pinned: { type: 'boolean' }
        }
      }
    }
  }, controller.list.bind(controller))

  // GET /v1/blobs/:id - Retrieve a blob
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

  // POST /v1/blobs/:id/pin - Pin a blob to cache
  fastify.post('/:id/pin', {
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
  }, controller.pin.bind(controller))

  // DELETE /v1/blobs/:id/pin - Unpin a blob
  fastify.delete('/:id/pin', {
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
  }, controller.unpin.bind(controller))

  // DELETE /v1/blobs/:id - Delete blob from cache
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