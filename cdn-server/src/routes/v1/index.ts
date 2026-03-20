import { webhookRoutes } from '../webhooks.js'
import { blobRoutes } from './blobs.js'
import { uploadRoutes } from './uploads.js'
import { cacheRoutes } from './cache.js'
import { analyticsRoutes } from './analytics.js'
// TODO: Fix ethers dependency before enabling
// import { verificationRoutes } from './verification.js'
import { enhancedAnalyticsRoutes } from './enhanced-analytics.js'
import { deployRoutes } from './deploy.js'
import { accessGateRoutes } from './access-gate.js'
import { observabilityRoutes } from './observability.js'
import type { FastifyInstance } from 'fastify'

export async function v1Routes(fastify: FastifyInstance) {
  await fastify.register(blobRoutes, { prefix: '/blobs' })
  await fastify.register(uploadRoutes, { prefix: '/uploads' })
  await fastify.register(cacheRoutes, { prefix: '/cache' })
  await fastify.register(analyticsRoutes, { prefix: '/analytics' })
  // TODO: Fix ethers dependency before enabling
  // await fastify.register(verificationRoutes, { prefix: '/verification' })
  await fastify.register(enhancedAnalyticsRoutes)
  await fastify.register(webhookRoutes, { prefix: '/webhooks' })
  await fastify.register(deployRoutes, { prefix: '/deploys' })
  await fastify.register(accessGateRoutes, { prefix: '/access-gates' })
  await fastify.register(observabilityRoutes, { prefix: '/observability' })
}
