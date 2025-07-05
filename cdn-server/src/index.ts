import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import { config } from './config/index.js'
import { cdnRoutes } from './routes/cdn.js'
import { apiRoutes } from './routes/api.js'
import { uploadRoutes } from './routes/upload.js'
import { cacheService } from './services/cache.js'
import { analyticsService } from './services/analytics.js'
import { endpointHealthService } from './services/endpoint-health.js'

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
  },
})

async function buildServer() {
  await fastify.register(helmet)

  await fastify.register(cors, {
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(cdnRoutes, { prefix: '/cdn' })
  await fastify.register(apiRoutes, { prefix: '/api' })
  await fastify.register(uploadRoutes, { prefix: '/upload' })

  fastify.get('/health', async (request, reply) => {
    const cacheStatus = await cacheService.healthCheck()
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: cacheStatus,
      version: '1.0.0',
    }
  })

  return fastify
}

async function start() {
  try {
    await cacheService.initialize()
    await analyticsService.initialize()
    await endpointHealthService.initialize()

    const server = await buildServer()

    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    })

    console.log(`🚀 WCDN Server running on port ${config.PORT}`)
    console.log(`📊 Health check: http://localhost:${config.PORT}/health`)
    console.log(`🔄 CDN endpoint: http://localhost:${config.PORT}/cdn/:cid`)
    console.log(
      `📤 Upload endpoint: http://localhost:${config.PORT}/upload/file`,
    )
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

if (import.meta.main) {
  start()
}

export { buildServer }
