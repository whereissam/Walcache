import type { FastifyInstance } from 'fastify'
import { blobRoutes } from './blobs.js'
import { uploadRoutes } from './uploads.js'
import { cacheRoutes } from './cache.js'
import { analyticsRoutes } from './analytics.js'

export async function v1Routes(fastify: FastifyInstance) {
  await fastify.register(blobRoutes, { prefix: '/blobs' })
  await fastify.register(uploadRoutes, { prefix: '/uploads' })
  await fastify.register(cacheRoutes, { prefix: '/cache' })
  await fastify.register(analyticsRoutes, { prefix: '/analytics' })
}