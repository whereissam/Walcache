import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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

interface CIDInfo {
  cid: string
  stats: CIDStats | null
  cached: boolean
  pinned: boolean
  cacheDate?: string
  ttl?: number
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
  // Data
  cidStats: Record<string, CIDStats>
  globalStats: GlobalStats | null
  cacheStats: CacheStats | null
  topCIDs: CIDStats[]
  cidInfo: CIDInfo | null

  // Upload Data
  vaults: TuskyVault[]
  files: TuskyFile[]
  uploads: Record<string, UploadProgress>

  // UI State
  isLoading: boolean
  error: string | null
  currentCID: string

  // Actions
  setCurrentCID: (cid: string) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void

  // API Actions
  fetchCIDStats: (cid: string) => Promise<void>
  fetchGlobalStats: () => Promise<void>
  fetchCacheStats: () => Promise<void>
  preloadCIDs: (cids: string[]) => Promise<void>
  pinCID: (cid: string) => Promise<void>
  unpinCID: (cid: string) => Promise<void>
  clearCache: () => Promise<void>

  // Upload Actions
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
const API_KEY = 'dev-secret-wcdn-2024' // Match the backend API key from .env

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
      // Initial state
      cidStats: {},
      globalStats: null,
      cacheStats: null,
      topCIDs: [],
      cidInfo: null,

      // Upload state
      vaults: [],
      files: [],
      uploads: {},

      isLoading: false,
      error: null,
      currentCID: '',

      // UI Actions
      setCurrentCID: (cid: string) => set({ currentCID: cid }),
      setError: (error: string | null) => set({ error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // API Actions
      fetchCIDStats: async (cid: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/stats/${cid}`)
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
          const response = await fetch(`${API_BASE}/metrics`)
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
                'X-API-Key': API_KEY,
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
      ): Promise<{ file: TuskyFile; uploadId: string }> => {
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
                'X-API-Key': API_KEY,
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

          return { file: data.file, uploadId }
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
                'X-API-Key': API_KEY,
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
          const { file: uploadedFile, uploadId } = await get().uploadFile(
            file,
            vaultId,
          )

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
