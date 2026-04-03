import { z } from 'zod'
import { accessGateService } from '../../services/access-gate.js'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthenticatedRequest } from '../../middleware/auth.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function accessGateRoutes(fastify: FastifyInstance) {
  // Create an access gate
  fastify.post(
    '/',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const schema = z.object({
        cids: z.array(z.string().min(1)).min(1),
        type: z.enum(['nft', 'allowlist', 'public']),
        contractAddress: z.string().optional(),
        chain: z.enum(['sui', 'ethereum']).optional(),
        minTokens: z.number().min(1).optional(),
        allowlist: z.array(z.string()).optional(),
      })

      try {
        const body = schema.parse(request.body)

        if (body.type === 'nft' && (!body.contractAddress || !body.chain)) {
          return reply.status(400).send({
            error: 'NFT gates require contractAddress and chain',
          })
        }

        if (body.type === 'allowlist' && (!body.allowlist || body.allowlist.length === 0)) {
          return reply.status(400).send({
            error: 'Allowlist gates require at least one address',
          })
        }

        const gate = accessGateService.createGate({
          ...body,
          createdBy: request.user?.id || 'anonymous',
        })

        return reply.status(201).send(gate)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request parameters',
            details: process.env.NODE_ENV !== 'production' ? error.errors : undefined,
          })
        }
        throw error
      }
    },
  )

  // List all gates
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const gates = accessGateService.listGates()
      return reply.send({ gates, total: gates.length })
    },
  )

  // Check access for a CID (public — used by CDN route)
  fastify.get(
    '/check/:cid',
    async (
      request: FastifyRequest<{ Params: { cid: string } }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params
      const { wallet } = request.query as { wallet?: string }

      const result = await accessGateService.checkAccess(cid, wallet)
      return reply.send(result)
    },
  )

  // Delete a gate
  fastify.delete(
    '/:gateId',
    { preHandler: requireAuth },
    (async (
      request: AuthenticatedRequest<{ Params: { gateId: string } }>,
      reply: FastifyReply,
    ) => {
      const { gateId } = request.params
      const removed = accessGateService.removeGate(gateId)

      if (!removed) {
        return reply.status(404).send({ error: 'Gate not found' })
      }

      return reply.send({ status: 'deleted', gateId })
    }) as any,
  )

  // Add wallet to allowlist gate
  fastify.post(
    '/:gateId/allowlist',
    { preHandler: requireAuth },
    (async (
      request: AuthenticatedRequest<{ Params: { gateId: string } }>,
      reply: FastifyReply,
    ) => {
      const { gateId } = request.params
      const { wallet } = (request.body || {}) as { wallet?: string }

      if (!wallet) {
        return reply.status(400).send({ error: 'wallet is required' })
      }

      const added = accessGateService.addToAllowlist(gateId, wallet)
      if (!added) {
        return reply.status(404).send({ error: 'Gate not found or not an allowlist gate' })
      }

      return reply.send({ status: 'added', wallet })
    }) as any,
  )

  // Remove wallet from allowlist gate
  fastify.delete(
    '/:gateId/allowlist/:wallet',
    { preHandler: requireAuth },
    (async (
      request: AuthenticatedRequest<{
        Params: { gateId: string; wallet: string }
      }>,
      reply: FastifyReply,
    ) => {
      const { gateId, wallet } = request.params
      const removed = accessGateService.removeFromAllowlist(gateId, wallet)

      if (!removed) {
        return reply.status(404).send({ error: 'Gate not found or wallet not in list' })
      }

      return reply.send({ status: 'removed', wallet })
    }) as any,
  )
}
