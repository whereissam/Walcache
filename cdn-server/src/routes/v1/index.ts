import type { FastifyInstance } from 'fastify'
import { blobRoutes } from './blobs.js'
import { uploadRoutes } from './uploads.js'
import { cacheRoutes } from './cache.js'
import { analyticsRoutes } from './analytics.js'
// TODO: Fix ethers dependency before enabling
// import { verificationRoutes } from './verification.js'
import { enhancedAnalyticsRoutes } from './enhanced-analytics.js'
import { webhookRoutes } from '../webhooks.js'

export async function v1Routes(fastify: FastifyInstance) {
  await fastify.register(blobRoutes, { prefix: '/blobs' })
  await fastify.register(uploadRoutes, { prefix: '/uploads' })
  await fastify.register(cacheRoutes, { prefix: '/cache' })
  await fastify.register(analyticsRoutes, { prefix: '/analytics' })
  // TODO: Fix ethers dependency before enabling
  // await fastify.register(verificationRoutes, { prefix: '/verification' })
  await fastify.register(enhancedAnalyticsRoutes, { prefix: '/analytics' })
  await fastify.register(webhookRoutes, { prefix: '/webhooks' })
}