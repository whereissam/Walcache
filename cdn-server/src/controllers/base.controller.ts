import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ApiError, ErrorType, PaginationParams, PaginatedResponse } from '../types/api.js'

export abstract class BaseController {
  protected sendError(
    reply: FastifyReply,
    statusCode: number,
    type: ErrorType,
    message: string,
    code?: string,
    param?: string
  ): void {
    const error: ApiError = {
      error: {
        type,
        message,
        ...(code && { code }),
        ...(param && { param })
      }
    }
    
    reply.status(statusCode).send(error)
  }

  protected sendValidationError(
    reply: FastifyReply,
    message: string,
    param?: string
  ): void {
    this.sendError(reply, 400, 'validation_error', message, 'VALIDATION_FAILED', param)
  }

  protected sendNotFoundError(
    reply: FastifyReply,
    resource: string,
    id: string
  ): void {
    this.sendError(
      reply,
      404,
      'not_found_error',
      `${resource} with id '${id}' not found`,
      'RESOURCE_NOT_FOUND'
    )
  }

  protected sendAuthenticationError(reply: FastifyReply): void {
    this.sendError(
      reply,
      401,
      'authentication_error',
      'Authentication required',
      'AUTHENTICATION_REQUIRED'
    )
  }

  protected sendPermissionError(reply: FastifyReply): void {
    this.sendError(
      reply,
      403,
      'permission_error',
      'Insufficient permissions',
      'PERMISSION_DENIED'
    )
  }

  protected sendRateLimitError(reply: FastifyReply): void {
    this.sendError(
      reply,
      429,
      'rate_limit_error',
      'Too many requests',
      'RATE_LIMIT_EXCEEDED'
    )
  }

  protected sendInternalError(reply: FastifyReply, message = 'Internal server error'): void {
    this.sendError(reply, 500, 'api_error', message, 'INTERNAL_ERROR')
  }

  protected sendNetworkError(reply: FastifyReply, message = 'Network error'): void {
    this.sendError(reply, 502, 'network_error', message, 'NETWORK_ERROR')
  }

  protected parsePaginationParams(query: any): PaginationParams {
    const params: PaginationParams = {}
    
    if (query.limit) {
      const limit = parseInt(query.limit, 10)
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100')
      }
      params.limit = limit
    } else {
      params.limit = 10 // Default limit
    }
    
    if (query.starting_after) {
      params.starting_after = query.starting_after
    }
    
    if (query.ending_before) {
      params.ending_before = query.ending_before
    }
    
    return params
  }

  protected createPaginatedResponse<T>(
    data: T[],
    url: string,
    hasMore: boolean
  ): PaginatedResponse<T> {
    return {
      object: 'list',
      data,
      has_more: hasMore,
      url
    }
  }

  protected generateId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}_${random}`
  }

  protected getUnixTimestamp(date?: Date): number {
    return Math.floor((date || new Date()).getTime() / 1000)
  }

  protected async handleAsync<T>(
    operation: () => Promise<T>,
    reply: FastifyReply,
    errorMessage = 'Operation failed'
  ): Promise<T | void> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('not found')) {
          this.sendNotFoundError(reply, 'Resource', 'unknown')
          return
        }
        if (error.message.includes('validation')) {
          this.sendValidationError(reply, error.message)
          return
        }
        this.sendInternalError(reply, error.message)
      } else {
        this.sendInternalError(reply, errorMessage)
      }
    }
  }
}