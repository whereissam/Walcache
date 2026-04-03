import React from 'react'
import { WALCACHE_API_URL } from '@/config/env'
import { useWalcacheStore } from '../store/walcacheStore'
import { useAuthStore } from '../store/authStore'

type StatusListener = (status: { isConnected: boolean; reconnectAttempts: number }) => void

export class RealtimeService {
  private ws: EventSource | null = null
  private reconnectInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private _isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners = new Set<StatusListener>()
  private consumerCount = 0

  public connect() {
    this.consumerCount++
    if (this.ws) return

    const authStore = useAuthStore.getState()
    if (!authStore.isAuthenticated) return

    try {
      this.setupServerSentEvents()
    } catch (error) {
      console.error('Failed to connect to real-time service:', error)
      this.scheduleReconnect()
    }
  }

  private setupServerSentEvents() {
    const authStore = useAuthStore.getState()
    if (!authStore.token) return

    const eventSource = new EventSource(
      `${WALCACHE_API_URL}/realtime?token=${authStore.token}`,
    )

    eventSource.onopen = () => {
      this._isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.notifyListeners()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleRealtimeUpdate(data)
      } catch (error) {
        console.error('Failed to parse real-time message:', error)
      }
    }

    eventSource.onerror = () => {
      this._isConnected = false
      eventSource.close()
      this.notifyListeners()
      this.scheduleReconnect()
    }

    this.ws = eventSource
  }

  private handleRealtimeUpdate(data: Record<string, unknown>) {
    const walcacheStore = useWalcacheStore.getState()

    switch (data.type) {
      case 'metrics_update':
        walcacheStore.fetchGlobalStats()
        break
      case 'cid_stats_update':
        if (typeof data.cid === 'string' && walcacheStore.currentCID === data.cid) {
          walcacheStore.fetchCIDStats(data.cid)
        }
        break
      case 'cache_stats_update':
        walcacheStore.fetchCacheStats()
        break
      case 'usage_alert':
      case 'token_usage_update': {
        const authStore = useAuthStore.getState()
        if (authStore.isAuthenticated) {
          if (data.type === 'usage_alert') authStore.loadDashboard()
          else authStore.loadTokens()
        }
        break
      }
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this._isConnected && this.ws && this.ws.readyState === EventSource.CLOSED) {
        this._isConnected = false
        this.notifyListeners()
        this.scheduleReconnect()
      }
    }, 30000)
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) clearInterval(this.reconnectInterval)
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    this.reconnectInterval = setTimeout(() => {
      this.consumerCount-- // connect() will re-increment
      this.connect()
    }, delay)
  }

  public release() {
    this.consumerCount--
    if (this.consumerCount <= 0) {
      this.consumerCount = 0
      this.disconnect()
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this._isConnected = false
    this.reconnectAttempts = 0
    this.consumerCount = 0
    this.notifyListeners()
  }

  public getConnectionStatus() {
    return {
      isConnected: this._isConnected,
      reconnectAttempts: this.reconnectAttempts,
    }
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notifyListeners() {
    const status = this.getConnectionStatus()
    this.listeners.forEach((fn) => fn(status))
  }
}

// Singleton
export const realtimeService = new RealtimeService()

// React hook — pushes connection status into React state
export const useRealtimeConnection = () => {
  const { isAuthenticated } = useAuthStore()
  const [status, setStatus] = React.useState(realtimeService.getConnectionStatus())

  React.useEffect(() => {
    const unsubscribe = realtimeService.onStatusChange(setStatus)

    if (isAuthenticated) {
      realtimeService.connect()
    } else {
      realtimeService.disconnect()
    }

    return () => {
      unsubscribe()
      realtimeService.release()
    }
  }, [isAuthenticated])

  return status
}

// Polling fallback
export class PollingService {
  private intervals: Array<NodeJS.Timeout> = []
  private isPolling = false

  start() {
    if (this.isPolling) return
    this.isPolling = true

    const walcacheStore = useWalcacheStore.getState()
    const authStore = useAuthStore.getState()

    const globalStatsInterval = setInterval(() => {
      walcacheStore.fetchGlobalStats()
    }, 30000)

    const cidStatsInterval = setInterval(() => {
      if (walcacheStore.currentCID) {
        walcacheStore.fetchCIDStats(walcacheStore.currentCID)
      }
    }, 15000)

    const dashboardInterval = setInterval(() => {
      if (authStore.isAuthenticated) {
        authStore.loadDashboard()
      }
    }, 60000)

    this.intervals.push(globalStatsInterval, cidStatsInterval, dashboardInterval)
  }

  stop() {
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []
    this.isPolling = false
  }
}

export const pollingService = new PollingService()
