import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { WALCACHE_API_URL } from '@/config/env'
import { useAuthStore } from './authStore'

interface CacheState {
  // UI State
  isLoading: boolean
  error: string | null

  // Actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void

  // Cache Management Actions
  preloadCIDs: (cids: Array<string>) => Promise<void>
  pinCID: (cid: string) => Promise<void>
  unpinCID: (cid: string) => Promise<void>
  clearCache: () => Promise<void>
}

const API_BASE = WALCACHE_API_URL

// Helper function to get authentication token from the auth store
const getAuthToken = () => {
  return useAuthStore.getState().token || ''
}

export const useCacheStore = create<CacheState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Cache Management Actions
      preloadCIDs: async (cids: Array<string>) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/preload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': getAuthToken(),
            },
            body: JSON.stringify({ cids }),
          })
          if (!response.ok) {
            throw new Error(`Failed to preload CIDs: ${response.statusText}`)
          }
          set({ isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to preload CIDs',
            isLoading: false,
          })
        }
      },

      pinCID: async (cid: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/pin/${cid}`, {
            method: 'POST',
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to pin CID: ${response.statusText}`)
          }
          set({ isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to pin CID',
            isLoading: false,
          })
        }
      },

      unpinCID: async (cid: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/unpin/${cid}`, {
            method: 'POST',
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to unpin CID: ${response.statusText}`)
          }
          set({ isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to unpin CID',
            isLoading: false,
          })
        }
      },

      clearCache: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/cache/clear`, {
            method: 'POST',
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to clear cache: ${response.statusText}`)
          }
          set({ isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to clear cache',
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'cache-store',
    },
  ),
)
