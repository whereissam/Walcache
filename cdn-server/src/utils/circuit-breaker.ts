import { BaseError, ErrorCode } from '../errors/base-error.js'

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedErrors?: (error: Error) => boolean
}

export class CircuitBreakerError extends BaseError {
  constructor(serviceName: string, correlationId?: string) {
    super(
      `Circuit breaker is OPEN for service: ${serviceName}`,
      ErrorCode.SERVICE_UNAVAILABLE,
      503,
      { serviceName, state: CircuitBreakerState.OPEN },
      correlationId,
      30, // retry after 30 seconds
    )
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: Date | null = null
  private successCount: number = 0

  constructor(
    private serviceName: string,
    private options: CircuitBreakerOptions,
  ) {}

  async execute<T>(fn: () => Promise<T>, correlationId?: string): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
        console.log(
          `🔄 Circuit breaker for ${this.serviceName} is now HALF_OPEN`,
        )
      } else {
        throw new CircuitBreakerError(this.serviceName, correlationId)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.lastFailureTime = null

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= 3) {
        // Require 3 successful calls to close
        this.state = CircuitBreakerState.CLOSED
        this.successCount = 0
        console.log(`✅ Circuit breaker for ${this.serviceName} is now CLOSED`)
      }
    }
  }

  private onFailure(error: Error): void {
    this.lastFailureTime = new Date()

    // Check if this is an expected error that shouldn't count towards failures
    if (this.options.expectedErrors && this.options.expectedErrors(error)) {
      return
    }

    this.failureCount++

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
      this.successCount = 0
      console.log(`🔴 Circuit breaker for ${this.serviceName} is now OPEN`)
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime()
    return timeSinceLastFailure >= this.options.recoveryTimeout
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getStats() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime?.toISOString(),
    }
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    console.log(`🔄 Circuit breaker for ${this.serviceName} has been reset`)
  }
}
