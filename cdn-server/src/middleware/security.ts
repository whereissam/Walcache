import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { appConfig } from '../config/index.js'
import { metricsService } from '../services/metrics.js'
import { AuthenticationError, ErrorCode } from '../errors/base-error.js'
import crypto from 'crypto'

export interface SecurityConfig {
  enableCsrf: boolean
  enableRequestSigning: boolean
  maxRequestSize: number
  blockedUserAgents: string[]
  allowedIpRanges?: string[]
  enableDDoSProtection: boolean
  enableBruteForceProtection: boolean
}

export interface ConnectionLimits {
  maxConnections: number
  maxConnectionsPerIP: number
  connectionTimeout: number
  keepAliveTimeout: number
}

export class SecurityMiddleware {
  private connectionCounts = new Map<string, number>()
  private bruteForceAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >()
  private blockedIPs = new Set<string>()
  private csrfTokens = new Map<string, { token: string; expires: Date }>()

  constructor(
    private config: SecurityConfig,
    private connectionLimits: ConnectionLimits,
  ) {}

  async register(fastify: FastifyInstance): Promise<void> {
    // Connection tracking
    fastify.addHook('onRequest', this.trackConnections.bind(this))
    fastify.addHook('onResponse', this.releaseConnection.bind(this))

    // Security headers
    fastify.addHook('onSend', this.addSecurityHeaders.bind(this))

    // Request validation
    fastify.addHook('preValidation', this.validateRequest.bind(this))

    // DDoS protection
    if (this.config.enableDDoSProtection) {
      fastify.addHook('onRequest', this.ddosProtection.bind(this))
    }

    // Brute force protection
    if (this.config.enableBruteForceProtection) {
      fastify.addHook('onRequest', this.bruteForceProtection.bind(this))
    }

    // CSRF protection
    if (this.config.enableCsrf) {
      await this.setupCsrfProtection(fastify)
    }

    // Request signing validation
    if (this.config.enableRequestSigning) {
      fastify.addHook('preValidation', this.validateRequestSignature.bind(this))
    }

    // Start cleanup interval
    this.startCleanupInterval()
  }

  private async trackConnections(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const clientIP = this.getClientIP(request)

    // Check if IP is blocked
    if (this.blockedIPs.has(clientIP)) {
      throw new AuthenticationError(
        'IP address is blocked',
        ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
        { clientIP },
      )
    }

    // Check connection limits
    const currentConnections = this.connectionCounts.get(clientIP) || 0
    if (currentConnections >= this.connectionLimits.maxConnectionsPerIP) {
      metricsService.counter('security.connections.rejected', 1, {
        reason: 'max_per_ip',
        clientIP,
      })

      throw new AuthenticationError(
        'Too many connections from this IP',
        ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
        { clientIP, currentConnections },
      )
    }

    // Update connection count
    this.connectionCounts.set(clientIP, currentConnections + 1)
    metricsService.gauge('security.connections.active', currentConnections + 1)
  }

  private async releaseConnection(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const currentConnections = this.connectionCounts.get(clientIP) || 0

    if (currentConnections > 0) {
      this.connectionCounts.set(clientIP, currentConnections - 1)
      metricsService.gauge(
        'security.connections.active',
        currentConnections - 1,
      )
    }
  }

  private async addSecurityHeaders(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: any,
  ): Promise<any> {
    // Add security headers
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    )

    if (appConfig.env === 'production') {
      reply.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      )
    }

    return payload
  }

  private async validateRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers['user-agent'] || ''

    // Check user agent blocklist
    if (
      this.config.blockedUserAgents.some((blocked) =>
        userAgent.includes(blocked),
      )
    ) {
      metricsService.counter('security.requests.blocked', 1, {
        reason: 'user_agent',
        clientIP,
      })

      throw new AuthenticationError(
        'User agent not allowed',
        ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
        { clientIP, userAgent },
      )
    }

    // Check request size
    const contentLength = parseInt(request.headers['content-length'] || '0')
    if (contentLength > this.config.maxRequestSize) {
      metricsService.counter('security.requests.blocked', 1, {
        reason: 'size_limit',
        clientIP,
      })

      throw new AuthenticationError(
        'Request too large',
        ErrorCode.VALIDATION_FAILED,
        { clientIP, contentLength, maxSize: this.config.maxRequestSize },
      )
    }

    // Check IP allowlist if configured
    if (this.config.allowedIpRanges && !this.isIPAllowed(clientIP)) {
      metricsService.counter('security.requests.blocked', 1, {
        reason: 'ip_not_allowed',
        clientIP,
      })

      throw new AuthenticationError(
        'IP address not allowed',
        ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
        { clientIP },
      )
    }
  }

  private async ddosProtection(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const clientIP = this.getClientIP(request)

    // Simple DDoS protection based on request rate
    const rateLimitKey = `ddos:${clientIP}`
    const currentCount = this.connectionCounts.get(rateLimitKey) || 0

    if (currentCount > 50) {
      // 50 requests per minute threshold
      this.blockedIPs.add(clientIP)
      metricsService.counter('security.ddos.blocked', 1, { clientIP })

      throw new AuthenticationError(
        'DDoS protection triggered',
        ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
        { clientIP },
        undefined,
        300, // 5 minute retry after
      )
    }
  }

  private async bruteForceProtection(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const clientIP = this.getClientIP(request)

    // Only check for authentication-related endpoints
    if (!request.url.includes('/api/') && !request.url.includes('/upload/')) {
      return
    }

    const attempts = this.bruteForceAttempts.get(clientIP)
    if (attempts && attempts.count > 10) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime()
      if (timeSinceLastAttempt < 300000) {
        // 5 minutes
        metricsService.counter('security.brute_force.blocked', 1, { clientIP })

        throw new AuthenticationError(
          'Too many authentication attempts',
          ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
          { clientIP },
          undefined,
          300,
        )
      }
    }
  }

  private async setupCsrfProtection(fastify: FastifyInstance): Promise<void> {
    // CSRF token endpoint
    fastify.get(
      '/api/csrf-token',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const token = this.generateCSRFToken()
        const sessionId =
          (request.headers['x-session-id'] as string) || 'anonymous'

        this.csrfTokens.set(sessionId, {
          token,
          expires: new Date(Date.now() + 3600000), // 1 hour
        })

        return { csrfToken: token }
      },
    )

    // CSRF validation hook
    fastify.addHook(
      'preValidation',
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
          const token = request.headers['x-csrf-token'] as string
          const sessionId =
            (request.headers['x-session-id'] as string) || 'anonymous'

          const storedToken = this.csrfTokens.get(sessionId)
          if (
            !storedToken ||
            storedToken.token !== token ||
            storedToken.expires < new Date()
          ) {
            throw new AuthenticationError(
              'Invalid CSRF token',
              ErrorCode.AUTH_INVALID_API_KEY,
              { sessionId },
            )
          }
        }
      },
    )
  }

  private async validateRequestSignature(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Only validate signatures for sensitive operations
    if (
      !request.url.includes('/api/cache/clear') &&
      !request.url.includes('/api/pin/')
    ) {
      return
    }

    const signature = request.headers['x-signature'] as string
    const timestamp = request.headers['x-timestamp'] as string
    const nonce = request.headers['x-nonce'] as string

    if (!signature || !timestamp || !nonce) {
      throw new AuthenticationError(
        'Missing signature headers',
        ErrorCode.AUTH_INVALID_API_KEY,
      )
    }

    // Check timestamp (within 5 minutes)
    const requestTime = parseInt(timestamp)
    const currentTime = Date.now() / 1000
    if (Math.abs(currentTime - requestTime) > 300) {
      throw new AuthenticationError(
        'Request timestamp expired',
        ErrorCode.AUTH_INVALID_API_KEY,
      )
    }

    // Validate signature
    const expectedSignature = this.generateSignature(
      request.method,
      request.url,
      timestamp,
      nonce,
      request.body,
    )

    if (signature !== expectedSignature) {
      throw new AuthenticationError(
        'Invalid request signature',
        ErrorCode.AUTH_INVALID_API_KEY,
      )
    }
  }

  private generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private generateSignature(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body?: any,
  ): string {
    const payload = `${method}\n${url}\n${timestamp}\n${nonce}\n${body ? JSON.stringify(body) : ''}`
    return crypto
      .createHmac('sha256', appConfig.secrets.apiKeySecret)
      .update(payload)
      .digest('hex')
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

  private isIPAllowed(ip: string): boolean {
    if (!this.config.allowedIpRanges) return true

    // Simple IP range check (for production, use a proper IP range library)
    return this.config.allowedIpRanges.some((range) => {
      if (range.includes('/')) {
        // CIDR notation
        return this.isIPInCIDR(ip, range)
      } else {
        // Exact match
        return ip === range
      }
    })
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR check (for production, use a proper CIDR library)
    const [network, prefix] = cidr.split('/')
    const ipParts = ip.split('.').map(Number)
    const networkParts = network.split('.').map(Number)
    const prefixLength = parseInt(prefix)

    const ipBinary =
      (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
    const networkBinary =
      (networkParts[0] << 24) +
      (networkParts[1] << 16) +
      (networkParts[2] << 8) +
      networkParts[3]
    const mask = (-1 << (32 - prefixLength)) >>> 0

    return (ipBinary & mask) === (networkBinary & mask)
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredTokens()
      this.cleanupConnectionCounts()
      this.cleanupBruteForceAttempts()
    }, 300000) // 5 minutes
  }

  private cleanupExpiredTokens(): void {
    const now = new Date()
    for (const [sessionId, token] of this.csrfTokens) {
      if (token.expires < now) {
        this.csrfTokens.delete(sessionId)
      }
    }
  }

  private cleanupConnectionCounts(): void {
    // Reset connection counts periodically
    for (const [ip, count] of this.connectionCounts) {
      if (count === 0) {
        this.connectionCounts.delete(ip)
      }
    }
  }

  private cleanupBruteForceAttempts(): void {
    const fiveMinutesAgo = new Date(Date.now() - 300000)
    for (const [ip, attempts] of this.bruteForceAttempts) {
      if (attempts.lastAttempt < fiveMinutesAgo) {
        this.bruteForceAttempts.delete(ip)
      }
    }
  }

  recordFailedAuth(clientIP: string): void {
    const attempts = this.bruteForceAttempts.get(clientIP) || {
      count: 0,
      lastAttempt: new Date(),
    }
    attempts.count += 1
    attempts.lastAttempt = new Date()
    this.bruteForceAttempts.set(clientIP, attempts)
  }

  getSecurityStats() {
    return {
      activeConnections: Array.from(this.connectionCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      blockedIPs: this.blockedIPs.size,
      bruteForceAttempts: this.bruteForceAttempts.size,
      csrfTokens: this.csrfTokens.size,
    }
  }
}

export function createSecurityMiddleware(): SecurityMiddleware {
  const securityConfig: SecurityConfig = {
    enableCsrf: appConfig.env === 'production',
    enableRequestSigning: appConfig.env === 'production',
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    blockedUserAgents: ['curl', 'wget', 'python-requests'],
    enableDDoSProtection: true,
    enableBruteForceProtection: true,
  }

  const connectionLimits: ConnectionLimits = {
    maxConnections: 1000,
    maxConnectionsPerIP: appConfig.env === 'development' ? 100 : 20,
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
  }

  return new SecurityMiddleware(securityConfig, connectionLimits)
}
