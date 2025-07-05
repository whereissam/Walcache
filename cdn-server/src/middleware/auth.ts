import { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config/index.js'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    authorized: boolean
    source: 'api_key' | 'none'
  }
}

export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers['x-api-key'] as string

  if (apiKey && apiKey === config.API_KEY_SECRET) {
    request.user = {
      authorized: true,
      source: 'api_key',
    }
  } else {
    request.user = {
      authorized: false,
      source: 'none',
    }
  }
}

export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply,
) {
  const apiKey = request.headers['x-api-key'] as string

  if (!apiKey) {
    return reply.status(401).send({
      error: 'Missing API key',
      message: 'Please provide X-API-Key header',
    })
  }

  if (apiKey !== config.API_KEY_SECRET) {
    return reply.status(403).send({
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    })
  }

  request.user = {
    authorized: true,
    source: 'api_key',
  }
}

export function createRateLimitByAuth() {
  return {
    keyGenerator: (request: AuthenticatedRequest) => {
      // Authenticated users get higher rate limits
      if (request.user?.authorized) {
        return `auth:${request.headers['x-api-key']}`
      }
      // Anonymous users limited by IP
      return `anon:${request.ip}`
    },
    max: (request: AuthenticatedRequest) => {
      return request.user?.authorized ? 1000 : 100 // 1000/min for auth, 100/min for anon
    },
  }
}
