import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { Agent } from 'http'
import { Agent as HttpsAgent } from 'https'
import { CircuitBreaker } from './circuit-breaker.js'
import { TimeoutError, ErrorCode } from '../errors/base-error.js'

// Extend the Axios config type to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number
    }
  }
}

export interface HttpClientOptions {
  timeout: number
  retries: number
  retryDelay: number
  maxSockets: number
  keepAlive: boolean
  circuitBreaker?: {
    failureThreshold: number
    recoveryTimeout: number
    monitoringPeriod: number
  }
}

export class HttpClient {
  private axios: AxiosInstance
  private circuitBreaker?: CircuitBreaker

  constructor(
    private serviceName: string,
    options: HttpClientOptions,
  ) {
    // Configure connection pooling
    const httpAgent = new Agent({
      keepAlive: options.keepAlive,
      maxSockets: options.maxSockets,
      timeout: options.timeout,
    })

    const httpsAgent = new HttpsAgent({
      keepAlive: options.keepAlive,
      maxSockets: options.maxSockets,
      timeout: options.timeout,
    })

    this.axios = axios.create({
      timeout: options.timeout,
      httpAgent,
      httpsAgent,
      maxRedirects: 3,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    })

    // Setup circuit breaker if configured
    if (options.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(serviceName, {
        failureThreshold: options.circuitBreaker.failureThreshold,
        recoveryTimeout: options.circuitBreaker.recoveryTimeout,
        monitoringPeriod: options.circuitBreaker.monitoringPeriod,
        expectedErrors: (error) => {
          // Don't count 4xx errors as failures
          return (
            axios.isAxiosError(error) &&
            error.response?.status !== undefined &&
            error.response.status < 500
          )
        },
      })
    }

    // Add request/response interceptors
    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        if (response.config.metadata?.startTime) {
          const duration = Date.now() - response.config.metadata.startTime
          console.log(
            `📡 ${this.serviceName} request completed in ${duration}ms`,
          )
        }
        return response
      },
      (error) => {
        const duration = error.config?.metadata?.startTime
          ? Date.now() - error.config.metadata.startTime
          : 0

        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            console.warn(
              `⏱️ ${this.serviceName} request timed out after ${duration}ms`,
            )
            return Promise.reject(
              new TimeoutError(`Request to ${this.serviceName} timed out`, {
                duration,
                url: error.config?.url,
              }),
            )
          }

          console.warn(
            `❌ ${this.serviceName} request failed: ${error.message} (${duration}ms)`,
          )
        }

        return Promise.reject(error)
      },
    )
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    const request = () =>
      this.axios.get<T>(url, {
        ...config,
        headers: {
          ...config?.headers,
          'X-Correlation-ID': correlationId,
        },
      })

    if (this.circuitBreaker) {
      const response = await this.circuitBreaker.execute(request, correlationId)
      return response.data
    }

    const response = await request()
    return response.data
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    const request = () =>
      this.axios.post<T>(url, data, {
        ...config,
        headers: {
          ...config?.headers,
          'X-Correlation-ID': correlationId,
        },
      })

    if (this.circuitBreaker) {
      const response = await this.circuitBreaker.execute(request, correlationId)
      return response.data
    }

    const response = await request()
    return response.data
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<T> {
    const request = () =>
      this.axios.put<T>(url, data, {
        ...config,
        headers: {
          ...config?.headers,
          'X-Correlation-ID': correlationId,
        },
      })

    if (this.circuitBreaker) {
      const response = await this.circuitBreaker.execute(request, correlationId)
      return response.data
    }

    const response = await request()
    return response.data
  }

  async head(
    url: string,
    config?: AxiosRequestConfig,
    correlationId?: string,
  ): Promise<any> {
    const request = () =>
      this.axios.head(url, {
        ...config,
        headers: {
          ...config?.headers,
          'X-Correlation-ID': correlationId,
        },
      })

    if (this.circuitBreaker) {
      return await this.circuitBreaker.execute(request, correlationId)
    }

    return await request()
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker?.getStats()
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker?.reset()
  }
}
