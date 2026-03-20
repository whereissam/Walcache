import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import { appConfig, config } from './config/index.js'
import { initializeDatabase, closeDatabase } from './db/index.js'
import { cdnRoutes } from './routes/cdn.js'
import { apiRoutes } from './routes/api.js'
import { uploadRoutes } from './routes/upload.js'
import { userRoutes } from './routes/user.js'
import { v1Routes } from './routes/v1/index.js'
import { sealRoutes } from './routes/seal.js'
import { registerSwagger } from './routes/swagger.js'
import { serviceContainer } from './container/service-container.js'
import { cacheService } from './services/cache.js'
import { analyticsService } from './services/analytics.js'
import { endpointHealthService } from './services/endpoint-health.js'
import { walrusService } from './services/walrus.js'
import { tuskyService } from './services/tusky.js'
import { userService } from './services/user.js'
import { registerErrorHandler } from './middleware/error-handler.js'
import { createSecurityMiddleware } from './middleware/security.js'
import { createConnectionManager } from './middleware/connection-manager.js'

const fastify = Fastify({
  logger: {
    level: appConfig.server.logLevel,
  },
})

async function buildServer() {
  // Register error handler first
  registerErrorHandler(fastify)

  // Initialize security and connection management
  const securityMiddleware = createSecurityMiddleware()
  const connectionManager = createConnectionManager()

  await securityMiddleware.register(fastify)
  await connectionManager.register(fastify)

  await fastify.register(helmet, {
    contentSecurityPolicy: appConfig.security.helmet.contentSecurityPolicy,
    crossOriginEmbedderPolicy:
      appConfig.security.helmet.crossOriginEmbedderPolicy,
  })

  await fastify.register(cors, {
    origin:
      appConfig.env === 'development'
        ? (origin, cb) => {
            // In development, allow any localhost origin
            if (
              !origin ||
              origin.startsWith('http://localhost:') ||
              origin.startsWith('http://127.0.0.1:')
            ) {
              cb(null, true)
            } else {
              cb(null, false)
            }
          }
        : appConfig.server.cors.origins,
    credentials: appConfig.server.cors.credentials,
  })

  await fastify.register(rateLimit, {
    max: appConfig.security.rateLimit.max,
    timeWindow: appConfig.security.rateLimit.timeWindow,
    keyGenerator: (request) => {
      // Use IP-based rate limiting with better key generation
      const forwarded = request.headers['x-forwarded-for'] as string
      const realIP = request.headers['x-real-ip'] as string

      if (forwarded) {
        return forwarded.split(',')[0].trim()
      }

      if (realIP) {
        return realIP
      }

      return request.ip
    },
  })

  // Register Swagger documentation
  await registerSwagger(fastify)

  // Register v1 API routes (new Stripe-style API)
  await fastify.register(v1Routes, { prefix: '/v1' })

  // Legacy routes (maintain backward compatibility)
  await fastify.register(cdnRoutes, { prefix: '/cdn' })
  await fastify.register(apiRoutes, { prefix: '/api' })
  await fastify.register(uploadRoutes, { prefix: '/upload' })
  await fastify.register(userRoutes, { prefix: '/users' })

  // Seal encryption routes
  await fastify.register(sealRoutes, { prefix: '/seal' })

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
    // Initialize SQLite database (creates tables if needed)
    initializeDatabase()

    // Register module-level singletons in container (same instances used by routes)
    serviceContainer.register('cache', () => cacheService)
    serviceContainer.register('analytics', () => analyticsService)
    serviceContainer.register('endpointHealth', () => endpointHealthService)
    serviceContainer.register('walrus', () => walrusService)
    serviceContainer.register('tusky', () => tuskyService)
    serviceContainer.register('user', () => userService)

    // Initialize all services (resolves factories in container)
    await serviceContainer.initialize()

    // Initialize individual services
    await cacheService.initialize()
    await analyticsService.initialize()
    await endpointHealthService.initialize()
    await walrusService.initialize(endpointHealthService)
    await userService.initialize()

    const server = await buildServer()

    await server.listen({
      port: appConfig.server.port,
      host: appConfig.server.host,
      backlog: 2048, // Increase connection backlog for concurrent requests
      // Configure server for high concurrency
      listenTextResolver: (address) => `🚀 WCDN Server listening at ${address}`,
    })

    console.log(`🚀 WCDN Server running on port ${config.PORT}`)
    console.log(`📊 Health check: http://localhost:${config.PORT}/health`)
    console.log(`🔄 CDN endpoint: http://localhost:${config.PORT}/cdn/:cid`)
    console.log(
      `📤 Upload endpoint: http://localhost:${config.PORT}/upload/file`,
    )

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Gracefully shutting down...')
      await serviceContainer.shutdown()
      closeDatabase()
      process.exit(0)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

export { buildServer }
