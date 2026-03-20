import { z } from 'zod'
import { deployLogService } from '../../services/deploy-log.js'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthenticatedRequest } from '../../middleware/auth.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function deployRoutes(fastify: FastifyInstance) {
  // Record a new deployment
  fastify.post(
    '/',
    { preHandler: requireAuth },
    (async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const schema = z.object({
        site: z.string().min(1),
        version: z.string().min(1),
        manifestBlobId: z.string().min(1),
        files: z.array(
          z.object({
            path: z.string(),
            blobId: z.string(),
            size: z.number(),
          }),
        ),
        entrypoint: z.string().optional(),
      })

      try {
        const body = schema.parse(request.body)
        const deploy = deployLogService.record({
          ...body,
          deployedAt: new Date().toISOString(),
        })
        return reply.status(201).send(deploy)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: 'Validation error', details: error.errors })
        }
        throw error
      }
    }) as any,
  )

  // List deployments for a site
  fastify.get(
    '/:site',
    { preHandler: requireAuth },
    (async (
      request: FastifyRequest<{ Params: { site: string } }>,
      reply: FastifyReply,
    ) => {
      const { site } = request.params
      const { limit } = request.query as { limit?: string }
      const deploys = deployLogService.list(site, limit ? parseInt(limit) : 20)
      return reply.send({ site, deploys, total: deploys.length })
    }) as any,
  )

  // List all sites
  fastify.get(
    '/',
    { preHandler: requireAuth },
    (async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const sites = deployLogService.listSites()
      return reply.send({ sites, total: sites.length })
    }) as any,
  )

  // Rollback to a previous deployment
  fastify.post(
    '/:site/rollback',
    { preHandler: requireAuth },
    (async (
      request: AuthenticatedRequest<{ Params: { site: string } }>,
      reply: FastifyReply,
    ) => {
      const { site } = request.params
      const { deployId } = (request.body || {}) as { deployId?: string }

      if (!deployId) {
        return reply.status(400).send({ error: 'deployId is required' })
      }

      const result = await deployLogService.rollback(site, deployId)
      if (!result.success) {
        return reply.status(404).send({ error: result.error })
      }

      return reply.send({
        status: 'rolled_back',
        deploy: result.deploy,
      })
    }) as any,
  )
}
