import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { userService } from '../services/user.js'
import {
  UserRegistration,
  LoginCredentials,
  TokenRequest,
  SubscriptionTier,
  ApiPermission,
} from '../types/user.js'
import {
  requireAuth,
  requirePermission,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js'
import {
  ValidationError,
  AuthenticationError,
  ErrorCode,
} from '../errors/base-error.js'
import { metricsService } from '../services/metrics.js'

// Validation schemas
const userRegistrationSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
})

const loginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const tokenRequestSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.nativeEnum(ApiPermission)).min(1),
  expiresAt: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
})

const subscriptionUpdateSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
})

export async function userRoutes(fastify: FastifyInstance) {
  // User registration
  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const registration = userRegistrationSchema.parse(request.body)
        const user = await userService.registerUser(registration)

        metricsService.counter('users.registration.success', 1, {
          tier: user.subscriptionTier,
        })

        return reply.status(201).send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            createdAt: user.createdAt,
          },
          message: 'User registered successfully',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          metricsService.counter('users.registration.validation_error', 1)
          throw new ValidationError('Invalid registration data', {
            errors: error.errors,
          })
        }
        throw error
      }
    },
  )

  // User login
  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const credentials = loginCredentialsSchema.parse(request.body)
        const user = await userService.loginUser(credentials)

        metricsService.counter('users.login.success', 1, {
          tier: user.subscriptionTier,
        })

        return reply.send({
          success: true,
          user,
          message: 'Login successful',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          metricsService.counter('users.login.validation_error', 1)
          throw new ValidationError('Invalid login data', {
            errors: error.errors,
          })
        }
        metricsService.counter('users.login.failed', 1)
        throw error
      }
    },
  )

  // Get user profile
  fastify.get(
    '/profile',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const user = await userService.getUserById(request.user!.id)
      if (!user) {
        throw new AuthenticationError(
          'User not found',
          ErrorCode.AUTH_INVALID_API_KEY,
        )
      }

      return reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpires: user.subscriptionExpires,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      })
    },
  )

  // Update user subscription
  fastify.put(
    '/subscription',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { tier } = subscriptionUpdateSchema.parse(request.body)
        const user = await userService.updateUserSubscription(
          request.user!.id,
          tier,
        )

        metricsService.counter('users.subscription.updated', 1, {
          fromTier: request.user!.subscriptionTier,
          toTier: tier,
        })

        return reply.send({
          success: true,
          user: {
            id: user.id,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionExpires: user.subscriptionExpires,
          },
          message: 'Subscription updated successfully',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError('Invalid subscription data', {
            errors: error.errors,
          })
        }
        throw error
      }
    },
  )

  // Get subscription plans
  fastify.get(
    '/plans',
    { preHandler: optionalAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const plans = userService.getSubscriptionPlans()

      return reply.send({
        success: true,
        plans,
      })
    },
  )

  // Create API token
  fastify.post(
    '/tokens',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tokenRequest = tokenRequestSchema.parse(request.body)

        // Parse expiration date if provided
        const parsedRequest: TokenRequest = {
          ...tokenRequest,
          expiresAt: tokenRequest.expiresAt
            ? new Date(tokenRequest.expiresAt)
            : undefined,
        }

        const token = await userService.createApiToken(
          request.user!.id,
          parsedRequest,
        )

        metricsService.counter('users.tokens.created', 1, {
          tier: request.user!.subscriptionTier,
        })

        return reply.status(201).send({
          success: true,
          token: {
            id: token.id,
            name: token.name,
            token: token.token, // Only return the actual token on creation
            permissions: token.permissions,
            limits: token.limits,
            createdAt: token.createdAt,
            expiresAt: token.expiresAt,
          },
          message: 'API token created successfully',
          warning: 'Save this token securely. It will not be shown again.',
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError('Invalid token request', {
            errors: error.errors,
          })
        }
        throw error
      }
    },
  )

  // Get user tokens
  fastify.get(
    '/tokens',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const tokens = await userService.getUserTokens(request.user!.id)

      return reply.send({
        success: true,
        tokens,
      })
    },
  )

  // Revoke API token
  fastify.delete(
    '/tokens/:tokenId',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { tokenId } = request.params as { tokenId: string }

      // Verify token belongs to user
      const userTokens = await userService.getUserTokens(request.user!.id)
      const tokenExists = userTokens.some((token) => token.id === tokenId)

      if (!tokenExists) {
        throw new AuthenticationError(
          'Token not found or not owned by user',
          ErrorCode.AUTH_INVALID_API_KEY,
        )
      }

      await userService.revokeApiToken(tokenId)

      metricsService.counter('users.tokens.revoked', 1, {
        tier: request.user!.subscriptionTier,
      })

      return reply.send({
        success: true,
        message: 'Token revoked successfully',
      })
    },
  )

  // Get token usage statistics
  fastify.get(
    '/tokens/:tokenId/usage',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const { tokenId } = request.params as { tokenId: string }

      // Get user tokens to find the specific token
      const userTokens = await userService.getUserTokens(request.user!.id)
      const token = userTokens.find((t) => t.id === tokenId)

      if (!token) {
        throw new AuthenticationError(
          'Token not found or not owned by user',
          ErrorCode.AUTH_INVALID_API_KEY,
        )
      }

      return reply.send({
        success: true,
        usage: token.usage,
        limits: token.limits,
        utilizationPercentage: {
          dailyRequests:
            (token.usage.dailyRequests / token.limits.requestsPerDay) * 100,
          monthlyRequests:
            (token.usage.monthlyRequests / token.limits.requestsPerMonth) * 100,
          monthlyBandwidth:
            (token.usage.monthlyBandwidth / token.limits.bandwidthPerMonth) *
            100,
        },
      })
    },
  )

  // Get user dashboard data
  fastify.get(
    '/dashboard',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const user = await userService.getUserById(request.user!.id)
      const tokens = await userService.getUserTokens(request.user!.id)
      const plans = userService.getSubscriptionPlans()

      if (!user) {
        throw new AuthenticationError(
          'User not found',
          ErrorCode.AUTH_INVALID_API_KEY,
        )
      }

      // Calculate total usage across all tokens
      const totalUsage = tokens.reduce(
        (acc, token) => ({
          totalRequests: acc.totalRequests + token.usage.totalRequests,
          monthlyRequests: acc.monthlyRequests + token.usage.monthlyRequests,
          dailyRequests: acc.dailyRequests + token.usage.dailyRequests,
          totalBandwidth: acc.totalBandwidth + token.usage.totalBandwidth,
          monthlyBandwidth: acc.monthlyBandwidth + token.usage.monthlyBandwidth,
          dailyBandwidth: acc.dailyBandwidth + token.usage.dailyBandwidth,
        }),
        {
          totalRequests: 0,
          monthlyRequests: 0,
          dailyRequests: 0,
          totalBandwidth: 0,
          monthlyBandwidth: 0,
          dailyBandwidth: 0,
        },
      )

      const currentPlan = plans.find((p) => p.tier === user.subscriptionTier)

      return reply.send({
        success: true,
        dashboard: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionExpires: user.subscriptionExpires,
          },
          currentPlan,
          totalUsage,
          tokens: tokens.length,
          activeTokens: tokens.filter((t) => t.isActive).length,
        },
      })
    },
  )
}
