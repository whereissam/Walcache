import axios from 'axios'
import { config } from '../config/index.js'
import {
  WALRUS_ENDPOINTS,
  type WalrusNetwork,
} from '../config/walrus-endpoints.js'
import { metricsService } from './metrics.js'

export interface IEndpointHealthService {
  initialize(): Promise<void>
  checkAllEndpoints(): Promise<void>
  getHealthyAggregators(): string[]
  getHealthyPublishers(): string[]
  getBestAggregator(): string | null
  getBestPublisher(): string | null
  getHealthStatus(): any
  destroy(): void
}

interface EndpointHealth {
  url: string
  isHealthy: boolean
  responseTime: number
  lastChecked: Date
  error?: string
}

export class EndpointHealthService implements IEndpointHealthService {
  private aggregatorHealth: Map<string, EndpointHealth> = new Map()
  private publisherHealth: Map<string, EndpointHealth> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null

  async initialize(): Promise<void> {
    console.log('🔍 Initializing Walrus endpoint health checks...')

    await this.checkAllEndpoints()

    // Start periodic health checks every 5 minutes
    this.healthCheckInterval = setInterval(
      () => {
        this.checkAllEndpoints()
      },
      5 * 60 * 1000,
    )

    console.log('✅ Endpoint health monitoring started')
  }

  async checkAllEndpoints(): Promise<void> {
    const network = config.WALRUS_NETWORK as WalrusNetwork
    const endpoints = WALRUS_ENDPOINTS[network]

    console.log(`🌐 Checking ${network} endpoints...`)

    // Check aggregators
    const aggregatorChecks = endpoints.aggregators.map((url) =>
      this.checkAggregatorEndpoint(url),
    )

    // Check publishers
    const publisherChecks = endpoints.publishers.map((url) =>
      this.checkPublisherEndpoint(url),
    )

    await Promise.allSettled([...aggregatorChecks, ...publisherChecks])

    this.logHealthStatus()
  }

  private async checkAggregatorEndpoint(url: string): Promise<void> {
    const startTime = Date.now()
    const labels = { endpoint: url, type: 'aggregator' }

    try {
      // Test basic connectivity to root endpoint
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 404 || status === 200,
      })

      const responseTime = Date.now() - startTime

      // Record metrics
      metricsService.histogram(
        'walrus.endpoint.response_time',
        responseTime,
        labels,
      )
      metricsService.counter('walrus.endpoint.requests.total', 1, {
        ...labels,
        status: 'success',
      })
      metricsService.gauge('walrus.endpoint.available', 1, labels)

      this.aggregatorHealth.set(url, {
        url,
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
      })
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Record failure metrics
      metricsService.histogram(
        'walrus.endpoint.response_time',
        responseTime,
        labels,
      )
      metricsService.counter('walrus.endpoint.requests.total', 1, {
        ...labels,
        status: 'failure',
      })
      metricsService.gauge('walrus.endpoint.available', 0, labels)

      this.aggregatorHealth.set(url, {
        url,
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  private async checkPublisherEndpoint(url: string): Promise<void> {
    const startTime = Date.now()
    const labels = { endpoint: url, type: 'publisher' }

    try {
      // Test with HEAD request to base URL
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Accept any non-server error
      })

      const responseTime = Date.now() - startTime

      // Record metrics
      metricsService.histogram(
        'walrus.endpoint.response_time',
        responseTime,
        labels,
      )
      metricsService.counter('walrus.endpoint.requests.total', 1, {
        ...labels,
        status: 'success',
      })
      metricsService.gauge('walrus.endpoint.available', 1, labels)

      this.publisherHealth.set(url, {
        url,
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
      })
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Record failure metrics
      metricsService.histogram(
        'walrus.endpoint.response_time',
        responseTime,
        labels,
      )
      metricsService.counter('walrus.endpoint.requests.total', 1, {
        ...labels,
        status: 'failure',
      })
      metricsService.gauge('walrus.endpoint.available', 0, labels)

      this.publisherHealth.set(url, {
        url,
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  getHealthyAggregators(): string[] {
    const network = config.WALRUS_NETWORK as WalrusNetwork
    return WALRUS_ENDPOINTS[network].aggregators.filter((url) => {
      const health = this.aggregatorHealth.get(url)
      return health?.isHealthy
    })
  }

  getHealthyPublishers(): string[] {
    const network = config.WALRUS_NETWORK as WalrusNetwork
    return WALRUS_ENDPOINTS[network].publishers.filter((url) => {
      const health = this.publisherHealth.get(url)
      return health?.isHealthy
    })
  }

  getBestAggregator(): string | null {
    const healthy = this.getHealthyAggregators()
    if (healthy.length === 0) return null

    // Sort by response time, return fastest
    return healthy.sort((a, b) => {
      const healthA = this.aggregatorHealth.get(a)!
      const healthB = this.aggregatorHealth.get(b)!
      return healthA.responseTime - healthB.responseTime
    })[0]
  }

  getBestPublisher(): string | null {
    const healthy = this.getHealthyPublishers()
    if (healthy.length === 0) return null

    // Sort by response time, return fastest
    return healthy.sort((a, b) => {
      const healthA = this.publisherHealth.get(a)!
      const healthB = this.publisherHealth.get(b)!
      return healthA.responseTime - healthB.responseTime
    })[0]
  }

  getHealthStatus() {
    const aggregators = Array.from(this.aggregatorHealth.values())
    const publishers = Array.from(this.publisherHealth.values())

    const healthyAggregators = aggregators.filter((h) => h.isHealthy)
    const healthyPublishers = publishers.filter((h) => h.isHealthy)

    // Calculate average response times
    const avgAggregatorResponseTime =
      healthyAggregators.length > 0
        ? healthyAggregators.reduce((sum, h) => sum + h.responseTime, 0) /
          healthyAggregators.length
        : 0

    const avgPublisherResponseTime =
      healthyPublishers.length > 0
        ? healthyPublishers.reduce((sum, h) => sum + h.responseTime, 0) /
          healthyPublishers.length
        : 0

    return {
      aggregators: {
        total: aggregators.length,
        healthy: healthyAggregators.length,
        avgResponseTime: avgAggregatorResponseTime,
        details: aggregators,
      },
      publishers: {
        total: publishers.length,
        healthy: healthyPublishers.length,
        avgResponseTime: avgPublisherResponseTime,
        details: publishers,
      },
      network: config.WALRUS_NETWORK,
      overall: {
        healthy: healthyAggregators.length > 0 && healthyPublishers.length > 0,
        score:
          (healthyAggregators.length / aggregators.length +
            healthyPublishers.length / publishers.length) /
          2,
      },
      lastCheck: new Date().toISOString(),
    }
  }

  private logHealthStatus(): void {
    const status = this.getHealthStatus()
    console.log(`📊 Walrus ${status.network} Health Status:`)
    console.log(
      `   Aggregators: ${status.aggregators.healthy}/${status.aggregators.total} healthy`,
    )
    console.log(
      `   Publishers: ${status.publishers.healthy}/${status.publishers.total} healthy`,
    )

    if (status.aggregators.healthy === 0) {
      console.error('❌ No healthy aggregators available!')
    }

    if (status.publishers.healthy === 0) {
      console.error('❌ No healthy publishers available!')
    }
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

export const endpointHealthService = new EndpointHealthService()
