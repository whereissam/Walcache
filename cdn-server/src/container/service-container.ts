import type { CacheService } from '../services/cache.js'
import type { AnalyticsService } from '../services/analytics.js'
import type { WalrusService } from '../services/walrus.js'
import type { TuskyService } from '../services/tusky.js'
import type { EndpointHealthService } from '../services/endpoint-health.js'
import type { UserService } from '../services/user.js'

export interface ServiceDependencies {
  cache: CacheService
  analytics: AnalyticsService
  walrus: WalrusService
  tusky: TuskyService
  endpointHealth: EndpointHealthService
  user: UserService
}

export class ServiceContainer {
  private services = new Map<string, any>()
  private initializing = new Set<string>()

  register<T>(
    name: keyof ServiceDependencies,
    factory: () => T | Promise<T>,
  ): void {
    this.services.set(name, { factory, instance: null })
  }

  async get<T>(name: keyof ServiceDependencies): Promise<T> {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not registered`)
    }

    if (service.instance) {
      return service.instance
    }

    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for service ${name}`)
    }

    this.initializing.add(name)
    try {
      const instance = await service.factory()
      service.instance = instance
      return instance
    } finally {
      this.initializing.delete(name)
    }
  }

  async initialize(): Promise<void> {
    const initPromises: Promise<any>[] = []

    for (const [name] of this.services) {
      initPromises.push(this.get(name as keyof ServiceDependencies))
    }

    await Promise.all(initPromises)
  }

  async shutdown(): Promise<void> {
    for (const [, service] of this.services) {
      if (service.instance && typeof service.instance.destroy === 'function') {
        await service.instance.destroy()
      }
    }
    this.services.clear()
  }
}

export const serviceContainer = new ServiceContainer()
