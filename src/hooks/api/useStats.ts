import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WALCACHE_BASE_URL } from '@/config/env'

interface CIDStats {
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

interface GlobalStats {
  totalRequests: number
  totalHits: number
  totalMisses: number
  globalHitRate: number
  avgLatency: number
  uniqueCIDs: number
  geographic?: Array<{ region: string; requests: number; percentage: number }>
  topCIDs?: Array<CIDStats>
}

interface CacheStats {
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

interface PerformanceStats {
  responseTimes: {
    p50: number
    p95: number
    p99: number
  }
  throughput: number
  errorRate: number
}

// Query keys for consistent caching
export const statsKeys = {
  all: ['stats'] as const,
  global: () => [...statsKeys.all, 'global'] as const,
  cache: () => [...statsKeys.all, 'cache'] as const,
  cid: (cid: string) => [...statsKeys.all, 'cid', cid] as const,
  topCIDs: () => [...statsKeys.all, 'topCIDs'] as const,
  performance: () => [...statsKeys.all, 'performance'] as const,
}

// API functions
async function fetchGlobalStats(): Promise<GlobalStats> {
  const response = await fetch(`${WALCACHE_BASE_URL}/api/metrics`)
  if (!response.ok) {
    throw new Error(`Failed to fetch global stats: ${response.statusText}`)
  }
  return response.json()
}

async function fetchCacheStats(): Promise<CacheStats> {
  const response = await fetch(`${WALCACHE_BASE_URL}/api/cache/stats`)
  if (!response.ok) {
    throw new Error(`Failed to fetch cache stats: ${response.statusText}`)
  }
  return response.json()
}

async function fetchCIDStats(cid: string): Promise<CIDStats> {
  const response = await fetch(`${WALCACHE_BASE_URL}/api/stats/${cid}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch CID stats: ${response.statusText}`)
  }
  return response.json()
}

async function fetchTopCIDs(globalStats: GlobalStats | undefined): Promise<Array<CIDStats>> {
  // topCIDs are included in the /api/metrics response
  if (globalStats?.topCIDs && globalStats.topCIDs.length > 0) {
    return globalStats.topCIDs
  }
  return []
}

async function fetchPerformanceStats(): Promise<PerformanceStats> {
  const response = await fetch(`${WALCACHE_BASE_URL}/v1/analytics/performance`)
  if (!response.ok) {
    throw new Error(`Failed to fetch performance stats: ${response.statusText}`)
  }
  return response.json()
}

// React Query hooks
export function useGlobalStats() {
  return useQuery({
    queryKey: statsKeys.global(),
    queryFn: fetchGlobalStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useCacheStats() {
  return useQuery({
    queryKey: statsKeys.cache(),
    queryFn: fetchCacheStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useCIDStats(cid: string) {
  return useQuery({
    queryKey: statsKeys.cid(cid),
    queryFn: () => fetchCIDStats(cid),
    enabled: !!cid,
    staleTime: 2 * 60 * 1000,
  })
}

export function useTopCIDs() {
  const { data: globalStats } = useGlobalStats()
  return useQuery({
    queryKey: statsKeys.topCIDs(),
    queryFn: () => fetchTopCIDs(globalStats),
    enabled: !!globalStats,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

export function usePerformanceStats() {
  return useQuery({
    queryKey: statsKeys.performance(),
    queryFn: fetchPerformanceStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// Cache management mutations
export function useClearCache() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${WALCACHE_BASE_URL}/api/cache/clear`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

export function usePinCID() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cid: string) => {
      const response = await fetch(`${WALCACHE_BASE_URL}/api/pin/${cid}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Failed to pin CID: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: (_, cid) => {
      queryClient.invalidateQueries({ queryKey: statsKeys.cid(cid) })
      queryClient.invalidateQueries({ queryKey: statsKeys.global() })
    },
  })
}

export function usePreloadCIDs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cids: Array<string>) => {
      const response = await fetch(`${WALCACHE_BASE_URL}/api/preload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cids }),
      })
      if (!response.ok) {
        throw new Error(`Failed to preload CIDs: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statsKeys.global() })
      queryClient.invalidateQueries({ queryKey: statsKeys.cache() })
    },
  })
}
