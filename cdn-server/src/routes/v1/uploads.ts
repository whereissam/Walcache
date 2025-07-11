import type { FastifyInstance } from 'fastify'
import { UploadsController } from '../../controllers/uploads.controller.js'
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../../middleware/auth.js'

export async function uploadRoutes(fastify: FastifyInstance) {
  const controller = new UploadsController()

  // Register multipart support
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  })

  // POST /v1/uploads - Create a new upload
  fastify.post('/', {
    preHandler: requireAuth,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          vault_id: { type: 'string' },
          parent_id: { type: 'string' }
        }
      }
    }
  }, controller.create.bind(controller))

  // GET /v1/uploads - List uploads
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          starting_after: { type: 'string' },
          ending_before: { type: 'string' },
          vault_id: { type: 'string' },
          status: { type: 'string', enum: ['processing', 'completed', 'failed'] }
        }
      }
    }
  }, controller.list.bind(controller))

  // GET /v1/uploads/:id - Retrieve an upload
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

  // DELETE /v1/uploads/:id - Delete an upload
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