import { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config/index.js'
import { userService } from '../services/user.js'
import { AuthenticatedUser, ApiPermission } from '../types/user.js'
import { AuthenticationError, ErrorCode } from '../errors/base-error.js'
import { metricsService } from '../services/metrics.js'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthenticatedUser
}

export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers['x-api-key'] as string

  if (apiKey) {
    try {
      // Try new token system first
      const user = await userService.validateApiToken(apiKey)
      if (user) {
        request.user = user
        return
      }
      
      // Fallback to legacy system
      if (apiKey === config.API_KEY_SECRET) {
        request.user = {
          id: 'legacy',
          email: 'legacy@system.local',
          username: 'legacy',
          subscriptionTier: 'enterprise' as any,
          subscriptionStatus: 'active' as any,
          permissions: [ApiPermission.ADMIN],
        }
      }
    } catch (error) {
      // Invalid token, continue without auth
    }
  }
}

export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers['x-api-key'] as string

  if (!apiKey) {
    metricsService.counter('auth.missing_token', 1)
    throw new AuthenticationError(
      'Missing API key',
      ErrorCode.AUTH_MISSING_API_KEY,
      { message: 'Please provide X-API-Key header' }
    )
  }

  try {
    // Try new token system first
    const user = await userService.validateApiToken(apiKey)
    if (user) {
      // Check usage limits
      if (user.token && !await userService.checkUsageLimits(user.token)) {
        metricsService.counter('auth.usage_limit_exceeded', 1, { 
          userId: user.id,
          tier: user.subscriptionTier 
        })
        throw new AuthenticationError(
          'Usage limit exceeded',
          ErrorCode.AUTH_RATE_LIMIT_EXCEEDED,
          { userId: user.id, tier: user.subscriptionTier }
        )
      }

      request.user = user
      metricsService.counter('auth.success', 1, { 
        userId: user.id,
        tier: user.subscriptionTier 
      })
      return
    }
    
    // Fallback to legacy system
    if (apiKey === config.API_KEY_SECRET) {
      request.user = {
        id: 'legacy',
        email: 'legacy@system.local',
        username: 'legacy',
        subscriptionTier: 'enterprise' as any,
        subscriptionStatus: 'active' as any,
        permissions: [ApiPermission.ADMIN],
      }
      metricsService.counter('auth.legacy_success', 1)
      return
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
  }

  metricsService.counter('auth.invalid_token', 1)
  throw new AuthenticationError(
    'Invalid API key',
    ErrorCode.AUTH_INVALID_API_KEY,
    { message: 'The provided API key is not valid' }
  )
}

export function requirePermission(permission: ApiPermission) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AuthenticationError(
        'Authentication required',
        ErrorCode.AUTH_MISSING_API_KEY
      )
    }

    if (!request.user.permissions.includes(permission) && !request.user.permissions.includes(ApiPermission.ADMIN)) {
      metricsService.counter('auth.permission_denied', 1, { 
        userId: request.user.id,
        permission,
        tier: request.user.subscriptionTier 
      })
      throw new AuthenticationError(
        'Insufficient permissions',
        ErrorCode.AUTH_INVALID_API_KEY,
        { required: permission, userPermissions: request.user.permissions }
      )
    }
  }
}

export function createRateLimitByAuth() {
  return {
    keyGenerator: (request: AuthenticatedRequest) => {
      if (request.user?.token) {
        return `token:${request.user.token.id}`
      }
      if (request.user?.id === 'legacy') {
        return `legacy:${request.headers['x-api-key']}`
      }
      return `anon:${request.ip}`
    },
    max: (request: AuthenticatedRequest) => {
      if (request.user?.token) {
        return request.user.token.limits.requestsPerMinute
      }
      if (request.user?.id === 'legacy') {
        return 1000
      }
      return 10 // Very limited for anonymous users
    },
  }
}

export async function trackUsage(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  responseSize: number = 0
) {
  if (request.user?.token) {
    const usage = {
      totalRequests: request.user.token.usage.totalRequests + 1,
      monthlyRequests: request.user.token.usage.monthlyRequests + 1,
      dailyRequests: request.user.token.usage.dailyRequests + 1,
      totalBandwidth: request.user.token.usage.totalBandwidth + responseSize,
      monthlyBandwidth: request.user.token.usage.monthlyBandwidth + responseSize,
      dailyBandwidth: request.user.token.usage.dailyBandwidth + responseSize,
    }

    await userService.updateTokenUsage(request.user.token.id, usage)
    
    metricsService.counter('api.usage.requests', 1, { 
      userId: request.user.id,
      tier: request.user.subscriptionTier 
    })
    metricsService.counter('api.usage.bandwidth', responseSize, { 
      userId: request.user.id,
      tier: request.user.subscriptionTier 
    })
  }
}
