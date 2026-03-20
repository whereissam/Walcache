import { observabilityService } from '../../services/observability.js'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthenticatedRequest } from '../../middleware/auth.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function observabilityRoutes(fastify: FastifyInstance) {
  // Cost summary
  fastify.get(
    '/costs',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24
      return reply.send(observabilityService.getCostSummary(periodHours))
    },
  )

  // Error summary
  fastify.get(
    '/errors',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24
      return reply.send(observabilityService.getErrorSummary(periodHours))
    },
  )

  // SLA summary
  fastify.get(
    '/sla',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24
      return reply.send(observabilityService.getSLASummary(periodHours))
    },
  )

  // Per-token usage
  fastify.get(
    '/tokens/:tokenId/usage',
    { preHandler: requireAuth },
    (async (
      request: FastifyRequest<{ Params: { tokenId: string } }>,
      reply: FastifyReply,
    ) => {
      const { tokenId } = request.params
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24
      return reply.send(
        observabilityService.getTokenUsage(tokenId, periodHours),
      )
    }) as any,
  )

  // All tokens usage
  fastify.get(
    '/tokens/usage',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24
      const usage = observabilityService.getAllTokenUsage(periodHours)
      return reply.send({ tokens: usage, total: usage.length })
    },
  )

  // Full dashboard (all observability data in one call)
  fastify.get(
    '/dashboard',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { hours } = request.query as { hours?: string }
      const periodHours = hours ? parseInt(hours) : 24

      return reply.send({
        costs: observabilityService.getCostSummary(periodHours),
        errors: observabilityService.getErrorSummary(periodHours),
        sla: observabilityService.getSLASummary(periodHours),
        tokens: observabilityService.getAllTokenUsage(periodHours),
      })
    },
  )
}
