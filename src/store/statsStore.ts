import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface CIDStats {
  cid: string
  requests: number
  hits: number
  misses: number
  hitRate: number
  avgLatency: number
  firstAccess: string
  lastAccess: string
  totalSize: number
}

export interface GlobalStats {
  totalRequests: number
  totalHits: number
  totalMisses: number
  globalHitRate: number
  avgLatency: number
  uniqueCIDs: number
  geographic?: Array<{ region: string; requests: number; percentage: number }>
}

export interface CacheStats {
  memory: {
    keys: number
    hits: number
    misses: number
    hitRate: number
  }
  redis: {
    keys: number
    memory: number
  }
  using: 'redis' | 'memory'
}

export interface CIDInfo {
  cid: string
  stats: CIDStats | null
  cached: boolean
  pinned: boolean
  cacheDate?: string
  ttl?: number
}

interface StatsState {
  // Data
  cidStats: Record<string, CIDStats>
  globalStats: GlobalStats | null
  cacheStats: CacheStats | null
  topCIDs: CIDStats[]
  cidInfo: CIDInfo | null

  // UI State
  isLoading: boolean
  error: string | null

  // Actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void

  // API Actions
  fetchCIDStats: (cid: string) => Promise<void>
  fetchGlobalStats: () => Promise<void>
  fetchCacheStats: () => Promise<void>
}

const API_BASE = 'http://localhost:4500/api'

// Helper function to get authentication token
const getAuthToken = () => {
  const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  return authStore.state?.token || 'dev-secret-wcdn-2024'
}

export const useStatsStore = create<StatsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      cidStats: {},
      globalStats: null,
      cacheStats: null,
      topCIDs: [],
      cidInfo: null,
      isLoading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      // API Actions
      fetchCIDStats: async (cid: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/stats/${cid}`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to fetch CID stats: ${response.statusText}`)
          }
          const stats = await response.json()
          set((state) => ({
            cidStats: { ...state.cidStats, [cid]: stats },
            isLoading: false,
          }))
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch CID stats',
            isLoading: false,
          })
        }
      },

      fetchGlobalStats: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/metrics`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(
              `Failed to fetch global stats: ${response.statusText}`,
            )
          }
          const globalStats = await response.json()

          // Also fetch top CIDs
          const topResponse = await fetch(`${API_BASE}/top-cids`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          const topCIDs = topResponse.ok ? await topResponse.json() : []

          set({ globalStats, topCIDs, isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch global stats',
            isLoading: false,
          })
        }
      },

      fetchCacheStats: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/cache/stats`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(
              `Failed to fetch cache stats: ${response.statusText}`,
            )
          }
          const cacheStats = await response.json()
          set({ cacheStats, isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch cache stats',
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'stats-store',
    },
  ),
)
