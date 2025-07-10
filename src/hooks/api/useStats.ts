import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// Query keys for consistent caching
export const statsKeys = {
  all: ['stats'] as const,
  global: () => [...statsKeys.all, 'global'] as const,
  cache: () => [...statsKeys.all, 'cache'] as const,
  cid: (cid: string) => [...statsKeys.all, 'cid', cid] as const,
  topCIDs: () => [...statsKeys.all, 'topCIDs'] as const,
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

async function fetchTopCIDs(): Promise<CIDStats[]> {
  const response = await fetch(`${WALCACHE_BASE_URL}/api/top-cids`)
  if (!response.ok) {
    throw new Error(`Failed to fetch top CIDs: ${response.statusText}`)
  }
  return response.json()
}

// React Query hooks
export function useGlobalStats() {
  return useQuery({
    queryKey: statsKeys.global(),
    queryFn: fetchGlobalStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useTopCIDs() {
  return useQuery({
    queryKey: statsKeys.topCIDs(),
    queryFn: fetchTopCIDs,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
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
      // Invalidate all stats queries after clearing cache
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
      // Invalidate CID stats and global stats
      queryClient.invalidateQueries({ queryKey: statsKeys.cid(cid) })
      queryClient.invalidateQueries({ queryKey: statsKeys.global() })
    },
  })
}

export function usePreloadCIDs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cids: string[]) => {
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
      // Invalidate stats after preloading
      queryClient.invalidateQueries({ queryKey: statsKeys.global() })
      queryClient.invalidateQueries({ queryKey: statsKeys.cache() })
    },
  })
}
