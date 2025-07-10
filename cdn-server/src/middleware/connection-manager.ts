import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { metricsService } from '../services/metrics.js'
import { appConfig } from '../config/index.js'

export interface ConnectionStats {
  activeConnections: number
  totalConnections: number
  connectionsPerSecond: number
  avgConnectionDuration: number
  connectionsByIP: Map<string, number>
  connectionsByUserAgent: Map<string, number>
}

export interface ConnectionLimits {
  maxConcurrentConnections: number
  maxConcurrentConnectionsPerIP: number
  maxConnectionDuration: number
  slowRequestThreshold: number
  connectionPoolSize: number
  keepAliveTimeout: number
}

export class ConnectionManager {
  private activeConnections = new Map<
    string,
    {
      startTime: number
      ip: string
      userAgent: string
      requestId: string
      socket?: any
    }
  >()

  private connectionQueue = new Map<
    string,
    {
      request: FastifyRequest
      reply: FastifyReply
      resolve: Function
      reject: Function
    }
  >()

  private connectionStats: ConnectionStats = {
    activeConnections: 0,
    totalConnections: 0,
    connectionsPerSecond: 0,
    avgConnectionDuration: 0,
    connectionsByIP: new Map(),
    connectionsByUserAgent: new Map(),
  }

  private recentConnections: number[] = []
  private connectionDurations: number[] = []
  private connectionPool: Set<string> = new Set()

  constructor(private limits: ConnectionLimits) {
    this.initializeConnectionPool()
    this.startStatsCollection()
  }

  private initializeConnectionPool(): void {
    // Initialize connection pool slots
    for (let i = 0; i < this.limits.connectionPoolSize; i++) {
      this.connectionPool.add(`pool_${i}`)
    }
  }

  async register(fastify: FastifyInstance): Promise<void> {
    // Connection lifecycle hooks
    fastify.addHook('onRequest', this.onConnectionStart.bind(this))
    fastify.addHook('onResponse', this.onConnectionEnd.bind(this))
    fastify.addHook('onError', this.onConnectionError.bind(this))

    // Connection monitoring endpoint
    fastify.get(
      '/api/connections/stats',
      async (request: FastifyRequest, reply: FastifyReply) => {
        return this.getConnectionStats()
      },
    )

    // Connection management endpoints
    fastify.post(
      '/api/connections/kill',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { ip, requestId } = request.body as {
          ip?: string
          requestId?: string
        }
        return this.killConnections(ip, requestId)
      },
    )

    // Graceful shutdown hook
    fastify.addHook('onClose', async () => {
      await this.gracefulShutdown()
    })
  }

  private async onConnectionStart(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId =
      (request.headers['x-request-id'] as string) || this.generateRequestId()
    const ip = this.getClientIP(request)
    const userAgent = request.headers['user-agent'] || 'unknown'

    // Check concurrent connection limits
    const currentConcurrentConnections = this.activeConnections.size
    if (currentConcurrentConnections >= this.limits.maxConcurrentConnections) {
      metricsService.counter('connections.rejected', 1, {
        reason: 'concurrent_limit',
      })
      reply.code(503).send({
        error: 'Server at capacity',
        maxConcurrentConnections: this.limits.maxConcurrentConnections,
        currentConnections: currentConcurrentConnections,
      })
      return
    }

    // Check per-IP concurrent connection limit
    const ipConcurrentConnections = Array.from(
      this.activeConnections.values(),
    ).filter((conn) => conn.ip === ip).length

    if (ipConcurrentConnections >= this.limits.maxConcurrentConnectionsPerIP) {
      metricsService.counter('connections.rejected', 1, {
        reason: 'ip_concurrent_limit',
        ip,
      })
      reply.code(429).send({
        error: 'Too many concurrent connections from this IP',
        maxConcurrentPerIP: this.limits.maxConcurrentConnectionsPerIP,
        currentFromIP: ipConcurrentConnections,
      })
      return
    }

    // Try to acquire connection from pool
    const poolSlot = await this.acquireConnectionSlot(requestId, ip, userAgent)
    if (!poolSlot) {
      // Queue the connection if pool is full
      await this.queueConnection(requestId, request, reply, ip, userAgent)
      return
    }

    // Register active connection
    this.activeConnections.set(requestId, {
      startTime: Date.now(),
      ip,
      userAgent,
      requestId,
      socket: request.socket,
    })

    // Update stats
    this.connectionStats.activeConnections = this.activeConnections.size
    this.connectionStats.totalConnections += 1
    this.updateIPStats(ip, 1)
    this.updateUserAgentStats(userAgent, 1)

    // Track recent connections for rate calculation
    this.recentConnections.push(Date.now())
    this.recentConnections = this.recentConnections.filter(
      (time) => Date.now() - time <= 1000,
    )

    // Record metrics
    metricsService.counter('connections.started', 1, { ip, userAgent })
    metricsService.gauge('connections.active', this.activeConnections.size)
    metricsService.gauge('connections.queued', this.connectionQueue.size)

    // Set request ID and connection info
    request.headers['x-request-id'] = requestId
    reply.header('X-Request-ID', requestId)
    reply.header('X-Connection-Pool-Slot', poolSlot)

    // Configure keep-alive
    if (request.socket) {
      request.socket.setKeepAlive(true, this.limits.keepAliveTimeout)
      request.socket.setTimeout(this.limits.maxConnectionDuration)
    }

    // Set connection timeout
    setTimeout(() => {
      if (this.activeConnections.has(requestId)) {
        this.killConnection(requestId, 'timeout')
      }
    }, this.limits.maxConnectionDuration)
  }

  private async acquireConnectionSlot(
    requestId: string,
    ip: string,
    userAgent: string,
  ): Promise<string | null> {
    // Try to get an available pool slot
    for (const slot of this.connectionPool) {
      if (
        !Array.from(this.activeConnections.values()).some((conn) =>
          conn.requestId.includes(slot),
        )
      ) {
        metricsService.counter('connections.pool.acquired', 1, { slot })
        return slot
      }
    }

    metricsService.counter('connections.pool.exhausted', 1, { ip })
    return null
  }

  private async queueConnection(
    requestId: string,
    request: FastifyRequest,
    reply: FastifyReply,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    // Check queue size limit
    if (this.connectionQueue.size >= this.limits.maxConcurrentConnections * 2) {
      metricsService.counter('connections.queue.rejected', 1, {
        reason: 'queue_full',
        ip,
      })
      reply.code(503).send({ error: 'Connection queue is full' })
      return
    }

    // Queue the connection
    const queuePromise = new Promise<void>((resolve, reject) => {
      this.connectionQueue.set(requestId, {
        request,
        reply,
        resolve,
        reject,
      })
    })

    metricsService.counter('connections.queued', 1, { ip })
    metricsService.gauge('connections.queue.size', this.connectionQueue.size)

    // Set queue timeout
    const queueTimeout = setTimeout(() => {
      const queued = this.connectionQueue.get(requestId)
      if (queued) {
        this.connectionQueue.delete(requestId)
        queued.reject(new Error('Connection queue timeout'))
        reply.code(408).send({ error: 'Connection queue timeout' })
      }
    }, 30000) // 30 second queue timeout

    try {
      await queuePromise
      clearTimeout(queueTimeout)
      // Retry connection establishment
      await this.onConnectionStart(request, reply)
    } catch (error) {
      clearTimeout(queueTimeout)
      this.connectionQueue.delete(requestId)
      metricsService.counter('connections.queue.timeout', 1, { ip })
    }
  }

  private async onConnectionEnd(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const requestId = request.headers['x-request-id'] as string
    const connection = this.activeConnections.get(requestId)

    if (!connection) return

    const duration = Date.now() - connection.startTime

    // Update stats
    this.connectionDurations.push(duration)
    this.connectionDurations = this.connectionDurations.slice(-100) // Keep last 100

    this.connectionStats.avgConnectionDuration =
      this.connectionDurations.reduce((sum, d) => sum + d, 0) /
      this.connectionDurations.length

    this.updateIPStats(connection.ip, -1)
    this.updateUserAgentStats(connection.userAgent, -1)

    // Remove connection and free pool slot
    this.activeConnections.delete(requestId)
    this.connectionStats.activeConnections = this.activeConnections.size

    // Process queued connections if any
    await this.processQueuedConnections()

    // Record metrics
    metricsService.counter('connections.completed', 1, {
      ip: connection.ip,
      userAgent: connection.userAgent,
    })
    metricsService.histogram('connections.duration', duration, {
      ip: connection.ip,
    })
    metricsService.gauge('connections.active', this.activeConnections.size)
    metricsService.gauge('connections.queued', this.connectionQueue.size)

    // Check for slow requests
    if (duration > this.limits.slowRequestThreshold) {
      metricsService.counter('connections.slow', 1, {
        ip: connection.ip,
        path: request.url,
      })
    }

    // Add response time header
    reply.header('X-Response-Time', `${duration}ms`)
  }

  private async processQueuedConnections(): Promise<void> {
    // Process one queued connection when a slot becomes available
    if (this.connectionQueue.size > 0) {
      const entriesIterator = this.connectionQueue.entries().next()
      if (!entriesIterator.done) {
        const [queuedId, queuedConnection] = entriesIterator.value
        this.connectionQueue.delete(queuedId)
        queuedConnection.resolve()
        metricsService.counter('connections.queue.processed', 1)
      }
    }
  }

  private async onConnectionError(
    request: FastifyRequest,
    reply: FastifyReply,
    error: Error,
  ): Promise<void> {
    const requestId = request.headers['x-request-id'] as string
    const connection = this.activeConnections.get(requestId)

    if (connection) {
      metricsService.counter('connections.errors', 1, {
        ip: connection.ip,
        error: error.name,
      })

      // Clean up connection
      this.activeConnections.delete(requestId)
      this.connectionStats.activeConnections = this.activeConnections.size
      this.updateIPStats(connection.ip, -1)
      this.updateUserAgentStats(connection.userAgent, -1)
    }
  }

  private killConnection(requestId: string, reason: string): void {
    const connection = this.activeConnections.get(requestId)
    if (connection) {
      this.activeConnections.delete(requestId)
      this.connectionStats.activeConnections = this.activeConnections.size
      this.updateIPStats(connection.ip, -1)
      this.updateUserAgentStats(connection.userAgent, -1)

      metricsService.counter('connections.killed', 1, {
        reason,
        ip: connection.ip,
      })
    }
  }

  private killConnections(ip?: string, requestId?: string): { killed: number } {
    let killed = 0

    if (requestId) {
      this.killConnection(requestId, 'manual')
      killed = 1
    } else if (ip) {
      const toKill = Array.from(this.activeConnections.entries())
        .filter(([_, conn]) => conn.ip === ip)
        .map(([id, _]) => id)

      toKill.forEach((id) => this.killConnection(id, 'manual'))
      killed = toKill.length
    }

    return { killed }
  }

  private updateIPStats(ip: string, delta: number): void {
    const current = this.connectionStats.connectionsByIP.get(ip) || 0
    const newValue = Math.max(0, current + delta)

    if (newValue === 0) {
      this.connectionStats.connectionsByIP.delete(ip)
    } else {
      this.connectionStats.connectionsByIP.set(ip, newValue)
    }
  }

  private updateUserAgentStats(userAgent: string, delta: number): void {
    const current =
      this.connectionStats.connectionsByUserAgent.get(userAgent) || 0
    const newValue = Math.max(0, current + delta)

    if (newValue === 0) {
      this.connectionStats.connectionsByUserAgent.delete(userAgent)
    } else {
      this.connectionStats.connectionsByUserAgent.set(userAgent, newValue)
    }
  }

  private startStatsCollection(): void {
    setInterval(() => {
      // Calculate connections per second
      this.connectionStats.connectionsPerSecond = this.recentConnections.length

      // Record metrics
      metricsService.gauge(
        'connections.per_second',
        this.connectionStats.connectionsPerSecond,
      )
      metricsService.gauge(
        'connections.avg_duration',
        this.connectionStats.avgConnectionDuration,
      )

      // Top IPs by connection count
      const topIPs = Array.from(this.connectionStats.connectionsByIP.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)

      topIPs.forEach(([ip, count]) => {
        metricsService.gauge('connections.by_ip', count, { ip })
      })
    }, 1000) // Every second
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🔄 Starting graceful shutdown...')

    // Give existing connections time to complete
    const shutdownTimeout = 30000 // 30 seconds
    const startTime = Date.now()

    while (
      this.activeConnections.size > 0 &&
      Date.now() - startTime < shutdownTimeout
    ) {
      console.log(
        `⏳ Waiting for ${this.activeConnections.size} connections to complete...`,
      )
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (this.activeConnections.size > 0) {
      console.log(
        `⚠️ Forcefully closing ${this.activeConnections.size} remaining connections`,
      )
      this.activeConnections.clear()
    }

    console.log('✅ Graceful shutdown completed')
  }

  private getClientIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string
    const realIP = request.headers['x-real-ip'] as string

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (realIP) {
      return realIP
    }

    return request.ip
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getConnectionStats(): ConnectionStats {
    return {
      ...this.connectionStats,
      connectionsByIP: new Map(this.connectionStats.connectionsByIP),
      connectionsByUserAgent: new Map(
        this.connectionStats.connectionsByUserAgent,
      ),
    }
  }

  getCurrentConnections(): Array<{
    requestId: string
    ip: string
    userAgent: string
    duration: number
  }> {
    const now = Date.now()
    return Array.from(this.activeConnections.entries()).map(
      ([requestId, conn]) => ({
        requestId,
        ip: conn.ip,
        userAgent: conn.userAgent,
        duration: now - conn.startTime,
      }),
    )
  }
}

export function createConnectionManager(): ConnectionManager {
  const limits: ConnectionLimits = {
    maxConcurrentConnections: appConfig.env === 'development' ? 100 : 1000,
    maxConcurrentConnectionsPerIP: appConfig.env === 'development' ? 10 : 20,
    maxConnectionDuration: 300000, // 5 minutes
    slowRequestThreshold: 5000, // 5 seconds
    connectionPoolSize: appConfig.env === 'development' ? 50 : 500,
    keepAliveTimeout: 30000, // 30 seconds
  }

  return new ConnectionManager(limits)
}
