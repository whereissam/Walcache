export enum ErrorCode {
  // Cache errors
  CACHE_CONNECTION_FAILED = 'CACHE_CONNECTION_FAILED',
  CACHE_OPERATION_FAILED = 'CACHE_OPERATION_FAILED',

  // Walrus errors
  WALRUS_BLOB_NOT_FOUND = 'WALRUS_BLOB_NOT_FOUND',
  WALRUS_BLOB_NOT_AVAILABLE_YET = 'WALRUS_BLOB_NOT_AVAILABLE_YET',
  WALRUS_ENDPOINT_UNAVAILABLE = 'WALRUS_ENDPOINT_UNAVAILABLE',
  WALRUS_UPLOAD_FAILED = 'WALRUS_UPLOAD_FAILED',
  WALRUS_INVALID_CID = 'WALRUS_INVALID_CID',

  // Tusky errors
  TUSKY_API_ERROR = 'TUSKY_API_ERROR',
  TUSKY_UPLOAD_FAILED = 'TUSKY_UPLOAD_FAILED',
  TUSKY_FILE_NOT_FOUND = 'TUSKY_FILE_NOT_FOUND',
  TUSKY_VAULT_NOT_FOUND = 'TUSKY_VAULT_NOT_FOUND',

  // Authentication errors
  AUTH_MISSING_API_KEY = 'AUTH_MISSING_API_KEY',
  AUTH_INVALID_API_KEY = 'AUTH_INVALID_API_KEY',
  AUTH_RATE_LIMIT_EXCEEDED = 'AUTH_RATE_LIMIT_EXCEEDED',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_FILE_SIZE = 'INVALID_FILE_SIZE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ErrorContext {
  [key: string]: any
}

export class BaseError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly context: ErrorContext
  public readonly timestamp: Date
  public readonly correlationId?: string
  public readonly retryAfter?: number

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context: ErrorContext = {},
    correlationId?: string,
    retryAfter?: number,
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.timestamp = new Date()
    this.correlationId = correlationId
    this.retryAfter = retryAfter

    // Ensure the error stack trace points to the calling code
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      retryAfter: this.retryAfter,
    }
  }
}

export class CacheError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    correlationId?: string,
  ) {
    super(message, code, 500, context, correlationId)
  }
}

export class WalrusError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context: ErrorContext = {},
    correlationId?: string,
    retryAfter?: number,
  ) {
    super(message, code, statusCode, context, correlationId, retryAfter)
  }
}

export class TuskyError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context: ErrorContext = {},
    correlationId?: string,
  ) {
    super(message, code, statusCode, context, correlationId)
  }
}

export class AuthenticationError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    correlationId?: string,
  ) {
    super(message, code, 401, context, correlationId)
  }
}

export class ValidationError extends BaseError {
  constructor(
    message: string,
    context: ErrorContext = {},
    correlationId?: string,
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, context, correlationId)
  }
}

export class TimeoutError extends BaseError {
  constructor(
    message: string,
    context: ErrorContext = {},
    correlationId?: string,
  ) {
    super(message, ErrorCode.TIMEOUT_ERROR, 408, context, correlationId)
  }
}
