import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { WALCACHE_BASE_URL } from '@/config/env'
import { useAuthStore } from './authStore'
import { WalrusCDNClient } from '../../packages/sdk/src/index.js'
import type {
  BlobResource,
  UploadResource,
  CacheResource,
  AnalyticsResource,
  GlobalAnalytics,
  CacheStats,
  WalrusCDNError,
} from '../../packages/sdk/src/types.js'

// Helper function to get authentication token from the auth store
const getAuthToken = () => {
  return useAuthStore.getState().token || ''
}

// Initialize SDK client with proper API key
let cdnClient = new WalrusCDNClient({
  baseUrl: WALCACHE_BASE_URL,
  apiKey: getAuthToken(),
})

const updateClientApiKey = () => {
  cdnClient = new WalrusCDNClient({
    baseUrl: WALCACHE_BASE_URL,
    apiKey: getAuthToken(),
  })
}

// Expose cdnClient for cross-store access (e.g., blockchain store)
export const getCDNClient = () => {
  updateClientApiKey()
  return cdnClient
}

interface BlobState {
  // v1 API Data
  blobs: Record<string, BlobResource>
  uploads: Record<string, UploadResource>
  cacheEntries: Record<string, CacheResource>
  analytics: Record<string, AnalyticsResource>
  globalAnalytics: GlobalAnalytics | null
  cacheStats: CacheStats | null

  // Pagination
  pagination: {
    blobs: { has_more: boolean; starting_after?: string }
    uploads: { has_more: boolean; starting_after?: string }
    cache: { has_more: boolean; starting_after?: string }
    analytics: { has_more: boolean; starting_after?: string }
  }

  // UI State
  isLoading: boolean
  error: WalrusCDNError | string | null

  // Actions
  setError: (error: WalrusCDNError | string | null) => void
  setLoading: (loading: boolean) => void

  // v1 API Actions
  fetchBlob: (blobId: string) => Promise<BlobResource>
  listBlobs: (params?: {
    limit?: number
    cached?: boolean
    pinned?: boolean
  }) => Promise<Array<BlobResource>>
  createUpload: (
    file: File,
    options?: { vault_id?: string; parent_id?: string },
  ) => Promise<UploadResource>
  listUploads: (params?: {
    limit?: number
    vault_id?: string
    status?: string
  }) => Promise<Array<UploadResource>>
  preloadBlobs: (blobIds: Array<string>) => Promise<void>
  pinBlob: (blobId: string) => Promise<BlobResource>
  unpinBlob: (blobId: string) => Promise<BlobResource>
  clearCacheEntries: (blobIds?: Array<string>) => Promise<void>
  fetchGlobalAnalytics: () => Promise<void>
  fetchCacheStatistics: () => Promise<void>
}

export const useBlobStore = create<BlobState>()(
  devtools(
    (set) => ({
      blobs: {},
      uploads: {},
      cacheEntries: {},
      analytics: {},
      globalAnalytics: null,
      cacheStats: null,

      pagination: {
        blobs: { has_more: false },
        uploads: { has_more: false },
        cache: { has_more: false },
        analytics: { has_more: false },
      },

      isLoading: false,
      error: null,

      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      fetchBlob: async (blobId) => {
        set({ isLoading: true, error: null })
        updateClientApiKey()
        try {
          const blob = await cdnClient.getBlob(blobId)
          set((state) => ({
            blobs: { ...state.blobs, [blobId]: blob },
            isLoading: false,
          }))
          return blob
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      listBlobs: async (params = {}) => {
        set({ isLoading: true, error: null })
        updateClientApiKey()
        try {
          const result = await cdnClient.listBlobs(params)
          const blobsMap = result.data.reduce(
            (acc, blob) => {
              acc[blob.id] = blob
              return acc
            },
            {} as Record<string, BlobResource>,
          )

          set((state) => ({
            blobs: { ...state.blobs, ...blobsMap },
            pagination: {
              ...state.pagination,
              blobs: {
                has_more: result.has_more,
                starting_after:
                  result.data.length > 0
                    ? result.data[result.data.length - 1].id
                    : undefined,
              },
            },
            isLoading: false,
          }))
          return result.data
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      createUpload: async (file, options = {}) => {
        set({ isLoading: true, error: null })
        updateClientApiKey()
        try {
          const upload = await cdnClient.createUpload(file, options)
          set((state) => ({
            uploads: { ...state.uploads, [upload.id]: upload },
            isLoading: false,
          }))
          return upload
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      listUploads: async (params = {}) => {
        set({ isLoading: true, error: null })
        try {
          const result = await cdnClient.listUploads(params)
          const uploadsMap = result.data.reduce(
            (acc, upload) => {
              acc[upload.id] = upload
              return acc
            },
            {} as Record<string, UploadResource>,
          )

          set((state) => ({
            uploads: { ...state.uploads, ...uploadsMap },
            pagination: {
              ...state.pagination,
              uploads: {
                has_more: result.has_more,
                starting_after:
                  result.data.length > 0
                    ? result.data[result.data.length - 1].id
                    : undefined,
              },
            },
            isLoading: false,
          }))
          return result.data
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      preloadBlobs: async (blobIds) => {
        set({ isLoading: true, error: null })
        try {
          await cdnClient.preloadBlobs(blobIds)
          set({ isLoading: false })
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      pinBlob: async (blobId) => {
        set({ isLoading: true, error: null })
        try {
          const blob = await cdnClient.pinBlob(blobId)
          set((state) => ({
            blobs: { ...state.blobs, [blobId]: blob },
            isLoading: false,
          }))
          return blob
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      unpinBlob: async (blobId) => {
        set({ isLoading: true, error: null })
        try {
          const blob = await cdnClient.unpinBlob(blobId)
          set((state) => ({
            blobs: { ...state.blobs, [blobId]: blob },
            isLoading: false,
          }))
          return blob
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      clearCacheEntries: async (blobIds?) => {
        set({ isLoading: true, error: null })
        try {
          await cdnClient.clearCache(blobIds)
          set({ isLoading: false })
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      fetchGlobalAnalytics: async () => {
        set({ isLoading: true, error: null })
        try {
          const analytics = await cdnClient.getGlobalAnalytics()
          set({ globalAnalytics: analytics, isLoading: false })
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err, isLoading: false })
          throw err
        }
      },

      fetchCacheStatistics: async () => {
        try {
          const stats = await cdnClient.getCacheStats()
          set({ cacheStats: stats })
        } catch (error) {
          const err = error as WalrusCDNError
          set({ error: err })
          throw err
        }
      },
    }),
    { name: 'blob-store' },
  ),
)
