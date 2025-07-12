import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { WalrusCDNClient } from '../../packages/sdk/src/index.js'
import type {
  BlobResource,
  UploadResource,
  CacheResource,
  AnalyticsResource,
  GlobalAnalytics,
  CacheStats,
  PaginatedList,
  WalrusCDNError,
  // Legacy types for backward compatibility
  CIDStats,
  CIDInfo,
  GlobalMetrics
} from '../../packages/sdk/src/types.js'

// Legacy interface adapters for backward compatibility
interface LegacyGlobalStats {
  totalRequests: number
  totalHits: number
  totalMisses: number
  globalHitRate: number
  avgLatency: number
  uniqueCIDs: number
  geographic?: Array<{ region: string; requests: number; percentage: number }>
}

interface LegacyCacheStats {
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

interface TuskyVault {
  id: string
  name: string
  description?: string
  isEncrypted: boolean
  createdAt: string
  updatedAt: string
  isOwner: boolean
  membersCount: number
  filesCount: number
  storageUsed: number
}

interface TuskyFile {
  id: string
  name: string
  size: number
  type: string
  vaultId: string
  parentId?: string
  blobId: string
  storedEpoch: number
  certifiedEpoch: number
  ref: string
  erasureCodeType: string
  status: 'active' | 'revoked' | 'deleted'
  createdAt: string
  updatedAt: string
  cdnUrl?: string
  downloadUrl?: string
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

interface WalcacheState {
  // v1 API Data
  blobs: Record<string, BlobResource>
  uploads: Record<string, UploadResource>
  cacheEntries: Record<string, CacheResource>
  analytics: Record<string, AnalyticsResource>
  globalAnalytics: GlobalAnalytics | null
  cacheStats: CacheStats | null

  // Legacy Data (for backward compatibility)
  cidStats: Record<string, CIDStats>
  globalStats: LegacyGlobalStats | null
  topCIDs: CIDStats[]
  cidInfo: CIDInfo | null

  // Upload Data (Tusky integration)
  vaults: TuskyVault[]
  files: TuskyFile[]
  uploadProgress: Record<string, UploadProgress>

  // Pagination State
  pagination: {
    blobs: { has_more: boolean; starting_after?: string }
    uploads: { has_more: boolean; starting_after?: string }
    cache: { has_more: boolean; starting_after?: string }
    analytics: { has_more: boolean; starting_after?: string }
  }

  // UI State
  isLoading: boolean
  error: WalrusCDNError | string | null
  currentCID: string

  // Basic Actions
  setCurrentCID: (cid: string) => void
  setError: (error: WalrusCDNError | string | null) => void
  setLoading: (loading: boolean) => void

  // v1 API Actions
  fetchBlob: (blobId: string) => Promise<BlobResource>
  listBlobs: (params?: { limit?: number; cached?: boolean; pinned?: boolean }) => Promise<BlobResource[]>
  createUpload: (file: File, options?: { vault_id?: string; parent_id?: string }) => Promise<UploadResource>
  listUploads: (params?: { limit?: number; vault_id?: string; status?: string }) => Promise<UploadResource[]>
  preloadBlobs: (blobIds: string[]) => Promise<void>
  pinBlob: (blobId: string) => Promise<BlobResource>
  unpinBlob: (blobId: string) => Promise<BlobResource>
  clearCacheEntries: (blobIds?: string[]) => Promise<void>
  fetchGlobalAnalytics: () => Promise<void>
  fetchCacheStatistics: () => Promise<void>

  // Legacy API Actions (backward compatibility)
  fetchCIDStats: (cid: string) => Promise<void>
  fetchGlobalStats: () => Promise<void>
  preloadCIDs: (cids: string[]) => Promise<void>
  pinCID: (cid: string) => Promise<void>
  unpinCID: (cid: string) => Promise<void>
  clearCache: () => Promise<void>

  // Upload Actions (Tusky integration)
  fetchVaults: () => Promise<void>
  createVault: (name: string, description?: string) => Promise<void>
  fetchFiles: (vaultId?: string) => Promise<void>
  uploadFile: (file: File, vaultId?: string) => Promise<TuskyFile>
  deleteFile: (fileId: string) => Promise<void>

  // Direct Walrus Upload (official API)
  uploadToWalrus: (file: File) => Promise<{
    blobId: string
    suiRef: string
    status: string
    size: number
    fileName: string
    cdnUrl: string
    directUrl: string
  }>

  // Walrus Blob Verification
  checkBlobOnWalrus: (blobId: string) => Promise<{
    available: boolean
    network?: 'testnet' | 'mainnet'
    aggregator?: string
  }>
  uploadAndVerify: (
    file: File,
    vaultId?: string,
  ) => Promise<{ file: TuskyFile; verified: boolean; network?: string }>
  uploadToWalrusAndVerify: (
    file: File,
  ) => Promise<{ upload: any; verified: boolean; network?: string }>
}

const API_BASE = 'http://localhost:4500/api'

// Helper function to get authentication token
const getAuthToken = () => {
  const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  return authStore.state?.token || 'dev-secret-wcdn-2024' // Fallback to dev key
}

// Initialize SDK client with proper API key
let cdnClient = new WalrusCDNClient({
  baseUrl: 'http://localhost:4500',
  apiKey: getAuthToken(),
})

// Function to reinitialize client with updated API key
const updateClientApiKey = () => {
  cdnClient = new WalrusCDNClient({
    baseUrl: 'http://localhost:4500',
    apiKey: getAuthToken(),
  })
}

// Walrus aggregators for verification
const WALRUS_AGGREGATORS = [
  // Testnet first
  {
    url: 'https://aggregator.walrus-testnet.walrus.space',
    network: 'testnet' as const,
  },
  {
    url: 'https://aggregator.testnet.walrus.atalma.io',
    network: 'testnet' as const,
  },
  {
    url: 'https://sui-walrus-tn-aggregator.bwarelabs.com',
    network: 'testnet' as const,
  },

  // Mainnet
  {
    url: 'https://aggregator.walrus-mainnet.walrus.space',
    network: 'mainnet' as const,
  },
  { url: 'https://aggregator.walrus.atalma.io', network: 'mainnet' as const },
  { url: 'https://walrus.globalstake.io', network: 'mainnet' as const },
]

export const useWalcacheStore = create<WalcacheState>()(
  devtools(
    (set, get) => ({
      // v1 API state
      blobs: {},
      uploads: {},
      cacheEntries: {},
      analytics: {},
      globalAnalytics: null,
      cacheStats: null,

      // Legacy state (backward compatibility)
      cidStats: {},
      globalStats: null,
      topCIDs: [],
      cidInfo: null,

      // Upload state
      vaults: [],
      files: [],
      uploadProgress: {},

      // Pagination state
      pagination: {
        blobs: { has_more: false },
        uploads: { has_more: false },
        cache: { has_more: false },
        analytics: { has_more: false },
      },

      isLoading: false,
      error: null,
      currentCID: '',

      // UI Actions
      setCurrentCID: (cid: string) => set({ currentCID: cid }),
      setError: (error: WalrusCDNError | string | null) => set({ error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // v1 API Actions
      fetchBlob: async (blobId: string): Promise<BlobResource> => {
        set({ isLoading: true, error: null })
        updateClientApiKey() // Ensure client has latest API key
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

      listBlobs: async (params = {}): Promise<BlobResource[]> => {
        set({ isLoading: true, error: null })
        updateClientApiKey()
        try {
          const result = await cdnClient.listBlobs(params)
          const blobsMap = result.data.reduce((acc, blob) => {
            acc[blob.id] = blob
            return acc
          }, {} as Record<string, BlobResource>)

          set((state) => ({
            blobs: { ...state.blobs, ...blobsMap },
            pagination: {
              ...state.pagination,
              blobs: {
                has_more: result.has_more,
                starting_after: result.data.length > 0 ? result.data[result.data.length - 1].id : undefined
              }
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

      createUpload: async (file: File, options = {}): Promise<UploadResource> => {
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

      listUploads: async (params = {}): Promise<UploadResource[]> => {
        set({ isLoading: true, error: null })
        try {
          const result = await cdnClient.listUploads(params)
          const uploadsMap = result.data.reduce((acc, upload) => {
            acc[upload.id] = upload
            return acc
          }, {} as Record<string, UploadResource>)

          set((state) => ({
            uploads: { ...state.uploads, ...uploadsMap },
            pagination: {
              ...state.pagination,
              uploads: {
                has_more: result.has_more,
                starting_after: result.data.length > 0 ? result.data[result.data.length - 1].id : undefined
              }
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

      preloadBlobs: async (blobIds: string[]) => {
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

      pinBlob: async (blobId: string): Promise<BlobResource> => {
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

      unpinBlob: async (blobId: string): Promise<BlobResource> => {
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

      clearCacheEntries: async (blobIds?: string[]) => {
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

      // Legacy API Actions (backward compatibility)
      fetchCIDStats: async (cid: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/stats/${cid}`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()

          set((state) => ({
            cidStats: { ...state.cidStats, [cid]: data.stats },
            cidInfo: data,
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()

          set({
            globalStats: data.global,
            cacheStats: data.cache,
            topCIDs: data.topCIDs,
            isLoading: false,
          })
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
        try {
          const response = await fetch(`${API_BASE}/cache/stats`)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()

          set({ cacheStats: data })
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch cache stats',
          })
        }
      },

      preloadCIDs: async (cids: string[]) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/preload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cids }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()

          if (data.errors > 0) {
            set({
              error: `Preloaded ${data.cached}/${data.total} CIDs. ${data.errors} errors.`,
              isLoading: false,
            })
          } else {
            set({
              error: null,
              isLoading: false,
            })
          }

          // Refresh global stats
          get().fetchGlobalStats()
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
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          set({ isLoading: false })

          // Refresh CID info
          get().fetchCIDStats(cid)
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
          const response = await fetch(`${API_BASE}/pin/${cid}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          set({ isLoading: false })

          // Refresh CID info
          get().fetchCIDStats(cid)
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
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          set({
            cidStats: {},
            globalStats: null,
            cacheStats: null,
            topCIDs: [],
            cidInfo: null,
            isLoading: false,
          })

          // Refresh stats
          get().fetchGlobalStats()
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to clear cache',
            isLoading: false,
          })
        }
      },

      // Upload Actions
      fetchVaults: async () => {
        set({ isLoading: true, error: null })
        try {
          // Add timestamp to prevent caching
          const timestamp = Date.now()
          const response = await fetch(
            `${API_BASE.replace('/api', '')}/upload/vaults?t=${timestamp}`,
            {
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache',
              },
            },
          )
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()

          set({
            vaults: data.vaults,
            isLoading: false,
          })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch vaults',
            isLoading: false,
          })
        }
      },

      createVault: async (name: string, description?: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(
            `${API_BASE.replace('/api', '')}/upload/vaults`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getAuthToken(),
              },
              body: JSON.stringify({ name, description }),
            },
          )

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()

          set((state) => ({
            vaults: [...state.vaults, data.vault],
            isLoading: false,
          }))
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to create vault',
            isLoading: false,
          })
        }
      },

      fetchFiles: async (vaultId?: string) => {
        set({ isLoading: true, error: null })
        try {
          const params = vaultId ? `?vaultId=${vaultId}` : ''
          const response = await fetch(
            `${API_BASE.replace('/api', '')}/upload/files${params}`,
          )

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()

          set({
            files: data.files,
            isLoading: false,
          })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch files',
            isLoading: false,
          })
        }
      },

      uploadFile: async (
        file: File,
        vaultId?: string,
        existingUploadId?: string,
      ): Promise<TuskyFile> => {
        const uploadId =
          existingUploadId || Math.random().toString(36).substring(2)

        set((state) => ({
          uploads: {
            ...state.uploads,
            [uploadId]: {
              fileName: file.name,
              progress: 0,
              status: 'uploading',
            },
          },
        }))

        try {
          const formData = new FormData()
          formData.append('file', file)

          const params = vaultId ? `?vaultId=${vaultId}` : ''
          const response = await fetch(
            `${API_BASE.replace('/api', '')}/upload/file${params}`,
            {
              method: 'POST',
              headers: {
                'X-API-Key': getAuthToken(),
              },
              body: formData,
            },
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              errorData.message ||
                `HTTP ${response.status}: ${response.statusText}`,
            )
          }

          const data = await response.json()

          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 100,
                status: 'completed',
              },
            },
            files: [...state.files, data.file],
          }))

          // Remove upload after 3 seconds
          setTimeout(() => {
            set((state) => {
              const newUploads = { ...state.uploads }
              delete newUploads[uploadId]
              return { uploads: newUploads }
            })
          }, 3000)

          return data.file
        } catch (error) {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              },
            },
          }))
          throw error
        }
      },

      deleteFile: async (fileId: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(
            `${API_BASE.replace('/api', '')}/upload/files/${fileId}`,
            {
              method: 'DELETE',
              headers: {
                'X-API-Key': getAuthToken(),
              },
            },
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              errorData.message ||
                `HTTP ${response.status}: ${response.statusText}`,
            )
          }

          // Remove file from local state
          set((state) => ({
            files: state.files.filter((f) => f.id !== fileId),
            isLoading: false,
          }))

          // Refresh vaults to update file counts
          await get().fetchVaults()
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to delete file',
            isLoading: false,
          })
          throw error // Re-throw so the UI can handle it
        }
      },

      // Check if blob is available on Walrus aggregators
      checkBlobOnWalrus: async (blobId: string) => {
        for (const aggregator of WALRUS_AGGREGATORS) {
          try {
            const response = await fetch(
              `${aggregator.url}/v1/blobs/${blobId}`,
              {
                method: 'HEAD',
                signal: AbortSignal.timeout(8000), // 8 second timeout
              },
            )

            if (response.ok) {
              console.log(
                `✓ Blob ${blobId} found on ${aggregator.network}: ${aggregator.url}`,
              )
              return {
                available: true,
                network: aggregator.network,
                aggregator: aggregator.url,
              }
            }
          } catch (error) {
            console.log(`✗ Failed to check ${aggregator.url}:`, error)
          }
        }

        console.log(`✗ Blob ${blobId} not found on any aggregator`)
        return { available: false }
      },

      // Upload file and verify it's available on Walrus
      uploadAndVerify: async (file: File, vaultId?: string) => {
        try {
          // Step 1: Upload file (this creates its own progress tracking)
          console.log(`📤 Uploading ${file.name}...`)
          const uploadedFile = await get().uploadFile(file, vaultId)
          const uploadId = Math.random().toString(36).substring(2)

          // Step 2: Update progress to show verifying
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 80,
                status: 'uploading', // Still uploading, now verifying
              },
            },
          }))

          // Step 3: Verify blob is available on Walrus
          console.log(`🔍 Verifying blob ${uploadedFile.blobId} on Walrus...`)

          // Wait a bit for potential sync
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const verification = await get().checkBlobOnWalrus(
            uploadedFile.blobId,
          )

          // Step 4: Complete with verification result
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 100,
                status: verification.available ? 'completed' : 'error',
                error: verification.available
                  ? undefined
                  : 'Blob not available on Walrus (may still be syncing)',
              },
            },
          }))

          // Remove upload tracking after delay
          setTimeout(
            () => {
              set((state) => {
                const newUploads = { ...state.uploads }
                delete newUploads[uploadId]
                return { uploads: newUploads }
              })
            },
            verification.available ? 3000 : 10000,
          ) // Keep error visible longer

          return {
            file: uploadedFile,
            verified: verification.available,
            network: verification.network,
          }
        } catch (error) {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              },
            },
          }))
          throw error
        }
      },

      // Direct upload to Walrus using official API
      uploadToWalrus: async (file: File) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(
          `${API_BASE.replace('/api', '')}/upload/walrus`,
          {
            method: 'POST',
            body: formData,
          },
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`,
          )
        }

        const data = await response.json()
        return data
      },

      // Upload to Walrus and verify it's immediately available
      uploadToWalrusAndVerify: async (file: File) => {
        const uploadId = Math.random().toString(36).substring(2)

        // Start upload progress tracking
        set((state) => ({
          uploads: {
            ...state.uploads,
            [uploadId]: {
              fileName: file.name,
              progress: 0,
              status: 'uploading',
            },
          },
        }))

        try {
          // Step 1: Upload directly to Walrus
          console.log(`📤 Uploading ${file.name} directly to Walrus...`)

          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 50,
                status: 'uploading',
              },
            },
          }))

          const uploadResult = await get().uploadToWalrus(file)

          // Step 2: Update progress to show verifying
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 80,
                status: 'uploading', // Now verifying
              },
            },
          }))

          // Step 3: Verify blob is available on Walrus
          console.log(`🔍 Verifying blob ${uploadResult.blobId} on Walrus...`)

          // Wait a moment for potential sync
          await new Promise((resolve) => setTimeout(resolve, 3000))

          const verification = await get().checkBlobOnWalrus(
            uploadResult.blobId,
          )

          // Step 4: Complete with verification result
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 100,
                status: verification.available ? 'completed' : 'error',
                error: verification.available
                  ? undefined
                  : 'Blob uploaded but not yet available on aggregators (still syncing)',
              },
            },
          }))

          // Remove upload tracking after delay
          setTimeout(
            () => {
              set((state) => {
                const newUploads = { ...state.uploads }
                delete newUploads[uploadId]
                return { uploads: newUploads }
              })
            },
            verification.available ? 3000 : 15000,
          ) // Keep sync errors visible longer

          return {
            upload: uploadResult,
            verified: verification.available,
            network: verification.network,
          }
        } catch (error) {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [uploadId]: {
                fileName: file.name,
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              },
            },
          }))
          throw error
        }
      },
    }),
    {
      name: 'wcdn-store',
    },
  ),
)
