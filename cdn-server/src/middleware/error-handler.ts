import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BaseError, ErrorCode } from '../errors/base-error.js'

export interface ErrorResponse {
  error: {
    code: string
    message: string
    statusCode: number
    timestamp: string
    correlationId?: string
    retryAfter?: number
    context?: any
  }
}

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = request.headers['x-correlation-id'] as string || 
                       request.headers['x-request-id'] as string ||
                       generateCorrelationId()

  // Log the error with structured logging
  const errorLog = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: sanitizeHeaders(request.headers),
      correlationId,
    },
    timestamp: new Date().toISOString(),
  }

  if (error instanceof BaseError) {
    request.log.error(errorLog, `${error.code}: ${error.message}`)
    
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp.toISOString(),
        correlationId: error.correlationId || correlationId,
        retryAfter: error.retryAfter,
        context: error.context,
      },
    }

    reply.status(error.statusCode).send(errorResponse)
  } else {
    // Handle unexpected errors
    request.log.error(errorLog, `Unexpected error: ${error.message}`)
    
    const errorResponse: ErrorResponse = {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        correlationId,
      },
    }

    reply.status(500).send(errorResponse)
  }
}

function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers }
  
  // Remove sensitive headers
  delete sanitized['authorization']
  delete sanitized['x-api-key']
  delete sanitized['cookie']
  delete sanitized['set-cookie']
  
  return sanitized
}

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(errorHandler)
  
  // Add correlation ID to all requests
  fastify.addHook('onRequest', async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string || 
                         request.headers['x-request-id'] as string ||
                         generateCorrelationId()
    
    request.headers['x-correlation-id'] = correlationId
    reply.header('X-Correlation-ID', correlationId)
  })
}