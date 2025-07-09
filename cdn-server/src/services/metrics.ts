import { performance } from 'perf_hooks'
import { config } from '../config/index.js'

export interface MetricPoint {
  timestamp: number
  value: number
  labels?: Record<string, string>
}

export interface HistogramBucket {
  upperBound: number
  count: number
}

export interface HistogramMetric {
  buckets: HistogramBucket[]
  sum: number
  count: number
}

export interface GaugeMetric {
  value: number
  timestamp: number
}

export interface CounterMetric {
  value: number
  timestamp: number
}

export interface SystemMetrics {
  memory: {
    used: number
    total: number
    heap: {
      used: number
      total: number
    }
  }
  cpu: {
    usage: number
  }
  process: {
    uptime: number
    pid: number
  }
  eventLoop: {
    lag: number
  }
}

export class MetricsService {
  private counters = new Map<string, CounterMetric>()
  private gauges = new Map<string, GaugeMetric>()
  private histograms = new Map<string, HistogramMetric>()
  private timers = new Map<string, number>()
  private enabled: boolean = config.ENABLE_ANALYTICS

  constructor() {
    if (this.enabled) {
      this.startSystemMetricsCollection()
    }
  }

  private startSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
    }, 30000)
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    this.gauge('system.memory.used', memUsage.rss)
    this.gauge('system.memory.heap.used', memUsage.heapUsed)
    this.gauge('system.memory.heap.total', memUsage.heapTotal)
    this.gauge('system.memory.external', memUsage.external)
    this.gauge('system.process.uptime', process.uptime())
    
    // Event loop lag measurement
    const start = performance.now()
    setImmediate(() => {
      const lag = performance.now() - start
      this.gauge('system.eventloop.lag', lag)
    })
  }

  counter(name: string, value: number = 1, labels?: Record<string, string>): void {
    if (!this.enabled) return
    
    const key = this.getMetricKey(name, labels)
    const existing = this.counters.get(key)
    
    if (existing) {
      existing.value += value
      existing.timestamp = Date.now()
    } else {
      this.counters.set(key, {
        value,
        timestamp: Date.now(),
      })
    }
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return
    
    const key = this.getMetricKey(name, labels)
    this.gauges.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return
    
    const key = this.getMetricKey(name, labels)
    const existing = this.histograms.get(key)
    
    if (existing) {
      existing.sum += value
      existing.count += 1
      
      // Update buckets
      for (const bucket of existing.buckets) {
        if (value <= bucket.upperBound) {
          bucket.count += 1
        }
      }
    } else {
      const buckets = this.createHistogramBuckets()
      for (const bucket of buckets) {
        if (value <= bucket.upperBound) {
          bucket.count = 1
        }
      }
      
      this.histograms.set(key, {
        buckets,
        sum: value,
        count: 1,
      })
    }
  }

  startTimer(name: string): void {
    if (!this.enabled) return
    this.timers.set(name, performance.now())
  }

  endTimer(name: string, labels?: Record<string, string>): number {
    if (!this.enabled) return 0
    
    const start = this.timers.get(name)
    if (!start) return 0
    
    const duration = performance.now() - start
    this.timers.delete(name)
    
    this.histogram(`${name}.duration`, duration, labels)
    return duration
  }

  private createHistogramBuckets(): HistogramBucket[] {
    const bounds = [0.001, 0.01, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000, 5000, 10000, Infinity]
    return bounds.map(upperBound => ({
      upperBound,
      count: 0,
    }))
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',')
    
    return `${name}{${labelString}}`
  }

  getMetrics(): any {
    const metrics: any = {
      counters: {},
      gauges: {},
      histograms: {},
      timestamp: Date.now(),
    }

    // Convert counters
    for (const [key, metric] of this.counters) {
      metrics.counters[key] = metric
    }

    // Convert gauges
    for (const [key, metric] of this.gauges) {
      metrics.gauges[key] = metric
    }

    // Convert histograms
    for (const [key, metric] of this.histograms) {
      metrics.histograms[key] = {
        ...metric,
        avg: metric.count > 0 ? metric.sum / metric.count : 0,
      }
    }

    return metrics
  }

  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    return {
      memory: {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.heapTotal,
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
        },
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
      },
      eventLoop: {
        lag: this.gauges.get('system.eventloop.lag')?.value || 0,
      },
    }
  }

  getPrometheusMetrics(): string {
    const lines: string[] = []
    
    // Add counters
    for (const [key, metric] of this.counters) {
      lines.push(`# TYPE ${key} counter`)
      lines.push(`${key} ${metric.value} ${metric.timestamp}`)
    }
    
    // Add gauges
    for (const [key, metric] of this.gauges) {
      lines.push(`# TYPE ${key} gauge`)
      lines.push(`${key} ${metric.value} ${metric.timestamp}`)
    }
    
    // Add histograms
    for (const [key, metric] of this.histograms) {
      lines.push(`# TYPE ${key} histogram`)
      
      for (const bucket of metric.buckets) {
        const bucketKey = key.replace('{', '_bucket{le="' + bucket.upperBound + '",')
        lines.push(`${bucketKey} ${bucket.count}`)
      }
      
      lines.push(`${key}_sum ${metric.sum}`)
      lines.push(`${key}_count ${metric.count}`)
    }
    
    return lines.join('\n')
  }

  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
    this.timers.clear()
  }
}

export const metricsService = new MetricsService()