/**
 * Standardized Error Handling System
 * 
 * Provides consistent error codes, messages, and handling across all chains
 * for better developer experience and debugging.
 */

import type { SupportedChain } from './types.js'

/**
 * Standard error codes used across all chains
 */
export enum WalcacheErrorCode {
  // Network/Connection Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Authentication/Authorization Errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  
  // Asset/Contract Errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  INVALID_CONTRACT_ADDRESS = 'INVALID_CONTRACT_ADDRESS',
  INVALID_TOKEN_ID = 'INVALID_TOKEN_ID',
  ASSET_NOT_OWNED = 'ASSET_NOT_OWNED',
  
  // Upload/Storage Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  METADATA_INVALID = 'METADATA_INVALID',
  
  // Blockchain-Specific Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  BLOCK_NOT_FOUND = 'BLOCK_NOT_FOUND',
  CHAIN_NOT_SUPPORTED = 'CHAIN_NOT_SUPPORTED',
  
  // Verification Errors
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  OWNERSHIP_VERIFICATION_FAILED = 'OWNERSHIP_VERIFICATION_FAILED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  TOKEN_REQUIREMENTS_NOT_MET = 'TOKEN_REQUIREMENTS_NOT_MET',
  
  // Search/Query Errors
  SEARCH_FAILED = 'SEARCH_FAILED',
  INVALID_SEARCH_CRITERIA = 'INVALID_SEARCH_CRITERIA',
  SEARCH_TIMEOUT = 'SEARCH_TIMEOUT',
  TOO_MANY_RESULTS = 'TOO_MANY_RESULTS',
  
  // Configuration Errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_REQUIRED_PARAMETER = 'MISSING_REQUIRED_PARAMETER',
  INVALID_PARAMETER_VALUE = 'INVALID_PARAMETER_VALUE',
  
  // Internal Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  
  // Cache Errors
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  CACHE_EXPIRED = 'CACHE_EXPIRED'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',        // Warnings, non-critical issues
  MEDIUM = 'medium',  // Errors that don't prevent core functionality
  HIGH = 'high',      // Critical errors that prevent core functionality
  CRITICAL = 'critical' // System-level errors requiring immediate attention
}

/**
 * Standardized error class for Walcache SDK
 */
export class WalcacheError extends Error {
  readonly code: WalcacheErrorCode
  readonly chain?: SupportedChain
  readonly severity: ErrorSeverity
  readonly retryable: boolean
  readonly timestamp: Date
  readonly context: Record<string, any>
  readonly originalError?: Error
  readonly suggestedAction?: string

  constructor(
    code: WalcacheErrorCode,
    message: string,
    options: {
      chain?: SupportedChain
      severity?: ErrorSeverity
      retryable?: boolean
      context?: Record<string, any>
      originalError?: Error
      suggestedAction?: string
    } = {}
  ) {
    super(message)
    this.name = 'WalcacheError'
    this.code = code
    this.chain = options.chain
    this.severity = options.severity || ErrorSeverity.MEDIUM
    this.retryable = options.retryable ?? this.isRetryableByDefault(code)
    this.timestamp = new Date()
    this.context = options.context || {}
    this.originalError = options.originalError
    this.suggestedAction = options.suggestedAction || this.getDefaultSuggestedAction(code)
  }

  /**
   * Convert error to JSON for logging/analytics
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      chain: this.chain,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined,
      suggestedAction: this.suggestedAction
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case WalcacheErrorCode.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection and try again.'
      
      case WalcacheErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment before trying again.'
      
      case WalcacheErrorCode.WALLET_NOT_CONNECTED:
        return 'Please connect your wallet to continue.'
      
      case WalcacheErrorCode.INSUFFICIENT_BALANCE:
        return 'Insufficient balance to complete this transaction.'
      
      case WalcacheErrorCode.ASSET_NOT_FOUND:
        return 'The requested asset could not be found.'
      
      case WalcacheErrorCode.FILE_TOO_LARGE:
        return 'File size exceeds the maximum allowed limit.'
      
      case WalcacheErrorCode.ACCESS_DENIED:
        return 'You do not have permission to access this resource.'
      
      default:
        return this.message
    }
  }

  /**
   * Determine if error is retryable by default
   */
  private isRetryableByDefault(code: WalcacheErrorCode): boolean {
    const retryableCodes = [
      WalcacheErrorCode.NETWORK_ERROR,
      WalcacheErrorCode.CONNECTION_TIMEOUT,
      WalcacheErrorCode.SERVICE_UNAVAILABLE,
      WalcacheErrorCode.RATE_LIMITED,
      WalcacheErrorCode.GAS_ESTIMATION_FAILED,
      WalcacheErrorCode.SEARCH_TIMEOUT,
      WalcacheErrorCode.CACHE_ERROR
    ]
    return retryableCodes.includes(code)
  }

  /**
   * Get default suggested action for error code
   */
  private getDefaultSuggestedAction(code: WalcacheErrorCode): string {
    switch (code) {
      case WalcacheErrorCode.NETWORK_ERROR:
        return 'Check your internet connection and retry the request'
      
      case WalcacheErrorCode.RATE_LIMITED:
        return 'Wait for the rate limit to reset and retry'
      
      case WalcacheErrorCode.WALLET_NOT_CONNECTED:
        return 'Connect your wallet and try again'
      
      case WalcacheErrorCode.INSUFFICIENT_BALANCE:
        return 'Add funds to your wallet and retry'
      
      case WalcacheErrorCode.FILE_TOO_LARGE:
        return 'Reduce file size or use compression'
      
      case WalcacheErrorCode.INVALID_API_KEY:
        return 'Check your API key configuration'
      
      default:
        return 'Review the error details and contact support if the issue persists'
    }
  }
}

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  operation?: string
  chain?: SupportedChain
  userAddress?: string
  contractAddress?: string
  tokenId?: string
  fileSize?: number
  fileName?: string
  requestId?: string
  timestamp?: Date
  [key: string]: any
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  private static errorCounts: Map<string, number> = new Map()
  private static lastErrors: Map<string, Date> = new Map()

  /**
   * Create standardized error from any error type
   */
  static createError(
    error: any,
    code: WalcacheErrorCode,
    context: ErrorContext = {}
  ): WalcacheError {
    if (error instanceof WalcacheError) {
      return error
    }

    let message = 'An unknown error occurred'
    let originalError: Error | undefined

    if (error instanceof Error) {
      message = error.message
      originalError = error
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error.message === 'string') {
      message = error.message
    }

    // Enhance message with chain-specific context
    if (context.chain) {
      message = `${context.chain.toUpperCase()}: ${message}`
    }

    return new WalcacheError(code, message, {
      chain: context.chain,
      context,
      originalError,
      severity: this.determineSeverity(code, error),
      retryable: this.shouldRetry(code, error, context)
    })
  }

  /**
   * Handle errors with automatic retries and circuit breaker pattern
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      backoffMultiplier?: number
      context?: ErrorContext
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoffMultiplier = 2,
      context = {}
    } = options

    let lastError: Error
    let currentDelay = delay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Reset error counts on success
        if (context.operation) {
          this.errorCounts.delete(context.operation)
        }
        
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Track error frequency
        if (context.operation) {
          const count = this.errorCounts.get(context.operation) || 0
          this.errorCounts.set(context.operation, count + 1)
          this.lastErrors.set(context.operation, new Date())
        }

        // Don't retry on last attempt or non-retryable errors
        if (attempt === maxRetries || !this.shouldRetry(WalcacheErrorCode.INTERNAL_ERROR, error, context)) {
          break
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        currentDelay *= backoffMultiplier
      }
    }

    // Create standardized error for final failure
    throw this.createError(lastError, WalcacheErrorCode.INTERNAL_ERROR, {
      ...context,
      attempts: maxRetries + 1,
      finalAttempt: true
    })
  }

  /**
   * Check if circuit breaker should prevent operation
   */
  static shouldCircuitBreak(operation: string): boolean {
    const errorCount = this.errorCounts.get(operation) || 0
    const lastError = this.lastErrors.get(operation)
    
    // Circuit breaker: prevent operation if too many recent errors
    if (errorCount >= 5 && lastError && Date.now() - lastError.getTime() < 60000) {
      return true
    }
    
    return false
  }

  /**
   * Create chain-specific error
   */
  static createChainError(
    error: any,
    chain: SupportedChain,
    operation: string,
    context: ErrorContext = {}
  ): WalcacheError {
    const code = this.mapChainError(error, chain)
    return this.createError(error, code, {
      ...context,
      chain,
      operation
    })
  }

  /**
   * Map chain-specific errors to standard error codes
   */
  private static mapChainError(error: any, chain: SupportedChain): WalcacheErrorCode {
    const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase()

    // Network/connection errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return WalcacheErrorCode.NETWORK_ERROR
    }

    if (errorMessage.includes('timeout')) {
      return WalcacheErrorCode.CONNECTION_TIMEOUT
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return WalcacheErrorCode.RATE_LIMITED
    }

    // Chain-specific error mapping
    switch (chain) {
      case 'ethereum':
        return this.mapEthereumError(errorMessage)
      case 'sui':
        return this.mapSuiError(errorMessage)
      case 'solana':
        return this.mapSolanaError(errorMessage)
      default:
        return WalcacheErrorCode.INTERNAL_ERROR
    }
  }

  /**
   * Map Ethereum-specific errors
   */
  private static mapEthereumError(errorMessage: string): WalcacheErrorCode {
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      return WalcacheErrorCode.INSUFFICIENT_BALANCE
    }

    if (errorMessage.includes('gas') && errorMessage.includes('estimation')) {
      return WalcacheErrorCode.GAS_ESTIMATION_FAILED
    }

    if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
      return WalcacheErrorCode.TRANSACTION_FAILED
    }

    if (errorMessage.includes('not found') && errorMessage.includes('contract')) {
      return WalcacheErrorCode.CONTRACT_NOT_FOUND
    }

    if (errorMessage.includes('invalid address')) {
      return WalcacheErrorCode.INVALID_CONTRACT_ADDRESS
    }

    return WalcacheErrorCode.INTERNAL_ERROR
  }

  /**
   * Map Sui-specific errors
   */
  private static mapSuiError(errorMessage: string): WalcacheErrorCode {
    if (errorMessage.includes('object not found') || errorMessage.includes('does not exist')) {
      return WalcacheErrorCode.ASSET_NOT_FOUND
    }

    if (errorMessage.includes('insufficient coin balance')) {
      return WalcacheErrorCode.INSUFFICIENT_BALANCE
    }

    if (errorMessage.includes('invalid object id')) {
      return WalcacheErrorCode.INVALID_CONTRACT_ADDRESS
    }

    if (errorMessage.includes('ownership')) {
      return WalcacheErrorCode.ASSET_NOT_OWNED
    }

    return WalcacheErrorCode.INTERNAL_ERROR
  }

  /**
   * Map Solana-specific errors
   */
  private static mapSolanaError(errorMessage: string): WalcacheErrorCode {
    if (errorMessage.includes('account not found') || errorMessage.includes('invalid account')) {
      return WalcacheErrorCode.ASSET_NOT_FOUND
    }

    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient lamports')) {
      return WalcacheErrorCode.INSUFFICIENT_BALANCE
    }

    if (errorMessage.includes('invalid public key') || errorMessage.includes('invalid address')) {
      return WalcacheErrorCode.INVALID_CONTRACT_ADDRESS
    }

    if (errorMessage.includes('transaction failed') || errorMessage.includes('simulation failed')) {
      return WalcacheErrorCode.TRANSACTION_FAILED
    }

    return WalcacheErrorCode.INTERNAL_ERROR
  }

  /**
   * Determine error severity
   */
  private static determineSeverity(code: WalcacheErrorCode, error: any): ErrorSeverity {
    const criticalCodes = [
      WalcacheErrorCode.INTERNAL_ERROR,
      WalcacheErrorCode.INVALID_API_KEY,
      WalcacheErrorCode.SERVICE_UNAVAILABLE
    ]

    const highSeverityCodes = [
      WalcacheErrorCode.UPLOAD_FAILED,
      WalcacheErrorCode.TRANSACTION_FAILED,
      WalcacheErrorCode.ACCESS_DENIED
    ]

    const lowSeverityCodes = [
      WalcacheErrorCode.CACHE_MISS,
      WalcacheErrorCode.ASSET_NOT_FOUND,
      WalcacheErrorCode.RATE_LIMITED
    ]

    if (criticalCodes.includes(code)) {
      return ErrorSeverity.CRITICAL
    }

    if (highSeverityCodes.includes(code)) {
      return ErrorSeverity.HIGH
    }

    if (lowSeverityCodes.includes(code)) {
      return ErrorSeverity.LOW
    }

    return ErrorSeverity.MEDIUM
  }

  /**
   * Determine if error should be retried
   */
  private static shouldRetry(
    code: WalcacheErrorCode,
    error: any,
    context: ErrorContext
  ): boolean {
    // Never retry certain errors
    const nonRetryableCodes = [
      WalcacheErrorCode.INVALID_API_KEY,
      WalcacheErrorCode.ACCESS_DENIED,
      WalcacheErrorCode.INVALID_CONTRACT_ADDRESS,
      WalcacheErrorCode.INVALID_TOKEN_ID,
      WalcacheErrorCode.FILE_TOO_LARGE,
      WalcacheErrorCode.INVALID_FILE_TYPE,
      WalcacheErrorCode.METADATA_INVALID
    ]

    if (nonRetryableCodes.includes(code)) {
      return false
    }

    // Check circuit breaker
    if (context.operation && this.shouldCircuitBreak(context.operation)) {
      return false
    }

    return true
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number
    errorsByCode: Record<string, number>
    recentErrors: Array<{ operation: string; count: number; lastError: Date }>
  } {
    const errorsByCode: Record<string, number> = {}
    let totalErrors = 0

    for (const [operation, count] of this.errorCounts) {
      totalErrors += count
      // This is simplified - in real implementation, you'd track by error code
      errorsByCode[operation] = count
    }

    const recentErrors = Array.from(this.errorCounts.entries()).map(([operation, count]) => ({
      operation,
      count,
      lastError: this.lastErrors.get(operation) || new Date()
    }))

    return {
      totalErrors,
      errorsByCode,
      recentErrors
    }
  }

  /**
   * Clear error statistics
   */
  static clearStats(): void {
    this.errorCounts.clear()
    this.lastErrors.clear()
  }
}