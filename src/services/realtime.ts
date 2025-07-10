import React from 'react'
import { useWalcacheStore } from '../store/walcacheStore'
import { useAuthStore } from '../store/authStore'

export class RealtimeService {
  private ws: WebSocket | null = null
  private reconnectInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    // Removed auto-connect - connections now managed by components
  }

  public connect() {
    if (this.ws) {
      console.log('Already connected or connecting')
      return
    }

    const authStore = useAuthStore.getState()

    if (!authStore.isAuthenticated) {
      console.log('Not authenticated, skipping WebSocket connection')
      return
    }

    try {
      // For now, we'll use Server-Sent Events instead of WebSocket
      // since the backend doesn't have WebSocket support yet
      this.setupServerSentEvents()
    } catch (error) {
      console.error('Failed to connect to real-time service:', error)
      this.scheduleReconnect()
    }
  }

  private setupServerSentEvents() {
    const authStore = useAuthStore.getState()

    if (!authStore.token) {
      console.log('No auth token available')
      return
    }

    // Create EventSource for real-time updates
    const eventSource = new EventSource(
      `http://localhost:4500/api/realtime?token=${authStore.token}`,
    )

    eventSource.onopen = () => {
      console.log('Real-time connection established')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleRealtimeUpdate(data)
      } catch (error) {
        console.error('Failed to parse real-time message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error)
      this.isConnected = false
      eventSource.close()
      this.scheduleReconnect()
    }

    // Store reference for cleanup
    this.ws = eventSource as any
  }

  private handleRealtimeUpdate(data: any) {
    const walcacheStore = useWalcacheStore.getState()

    switch (data.type) {
      case 'metrics_update':
        // Update global stats without loading state
        walcacheStore.fetchGlobalStats()
        break

      case 'cid_stats_update':
        if (data.cid && walcacheStore.currentCID === data.cid) {
          walcacheStore.fetchCIDStats(data.cid)
        }
        break

      case 'cache_stats_update':
        // Update cache stats
        walcacheStore.fetchCacheStats()
        break

      case 'usage_alert':
        // Handle usage alerts for user dashboard
        const authStore = useAuthStore.getState()
        if (authStore.isAuthenticated) {
          authStore.loadDashboard()
        }
        break

      case 'token_usage_update':
        // Update token usage stats
        const authStore2 = useAuthStore.getState()
        if (authStore2.isAuthenticated) {
          authStore2.loadTokens()
        }
        break

      default:
        console.log('Unknown real-time update type:', data.type)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Send heartbeat or check connection
        this.ping()
      }
    }, 30000) // 30 seconds
  }

  private ping() {
    // For SSE, we can't send messages, so we'll just check if connection is alive
    if (this.ws && this.ws.readyState === EventSource.CLOSED) {
      this.isConnected = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    )

    this.reconnectInterval = setTimeout(() => {
      this.connect()
    }, delay)
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

    this.isConnected = false
    this.reconnectAttempts = 0
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    }
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService()

// Hook for React components
export const useRealtimeConnection = () => {
  const { isAuthenticated } = useAuthStore()

  // Auto-connect/disconnect based on auth state
  React.useEffect(() => {
    if (isAuthenticated) {
      realtimeService.connect()
    } else {
      realtimeService.disconnect()
    }

    return () => {
      realtimeService.disconnect()
    }
  }, [isAuthenticated])

  return realtimeService.getConnectionStatus()
}

// Polling fallback for when real-time connection is not available
export class PollingService {
  private intervals: NodeJS.Timeout[] = []
  private isPolling = false

  start() {
    if (this.isPolling) return

    this.isPolling = true
    const walcacheStore = useWalcacheStore.getState()
    const authStore = useAuthStore.getState()

    // Poll global stats every 30 seconds
    const globalStatsInterval = setInterval(() => {
      walcacheStore.fetchGlobalStats()
    }, 30000)

    // Poll current CID stats every 15 seconds
    const cidStatsInterval = setInterval(() => {
      if (walcacheStore.currentCID) {
        walcacheStore.fetchCIDStats(walcacheStore.currentCID)
      }
    }, 15000)

    // Poll user dashboard every 60 seconds
    const dashboardInterval = setInterval(() => {
      if (authStore.isAuthenticated) {
        authStore.loadDashboard()
      }
    }, 60000)

    this.intervals.push(
      globalStatsInterval,
      cidStatsInterval,
      dashboardInterval,
    )
  }

  stop() {
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []
    this.isPolling = false
  }
}

export const pollingService = new PollingService()

// REMOVED AUTO-START - This was causing memory leak!
// Polling will now only start when explicitly called from components
