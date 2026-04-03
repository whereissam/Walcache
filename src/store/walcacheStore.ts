/**
 * walcacheStore — Backward-compatible facade.
 *
 * This store delegates to domain-specific stores:
 *   - useBlobStore: v1 API blob/cache/analytics operations
 *   - useBlockchainStore: blockchain registration & verification
 *   - useUploadStore: Tusky vault/file CRUD
 *   - useStatsStore: legacy analytics
 *   - useCacheStore: legacy cache operations
 *
 * New code should import from the domain stores directly.
 * This facade exists so existing components don't break.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { WALCACHE_BASE_URL, WALCACHE_API_URL } from '@/config/env'
import { useAuthStore } from './authStore'
import { useBlobStore } from './blobStore'
import { useBlockchainStore } from './blockchainStore'
import type {
  BlobResource,
  UploadResource,
  CacheResource,
  AnalyticsResource,
  GlobalAnalytics,
  CacheStats,
  WalrusCDNError,
  SupportedChain,
  CIDStats,
  CIDInfo,
} from '../../packages/sdk/src/types.js'

// Re-export domain stores for gradual migration
export { useBlobStore } from './blobStore'
export { useBlockchainStore } from './blockchainStore'

// Legacy interface adapters
interface LegacyGlobalStats {
  totalRequests: number
  totalHits: number
  totalMisses: number
  globalHitRate: number
  avgLatency: number
  uniqueCIDs: number
  geographic?: Array<{ region: string; requests: number; percentage: number }>
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
  id: string
  object: 'upload_progress'
  created: number
  fileName: string
  filename: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  size: number
  content_type: string
  blob_id?: string
  vault_id?: string
  parent_id?: string
  error?: string
}

const API_BASE = WALCACHE_API_URL

const getAuthToken = () => {
  return useAuthStore.getState().token || ''
}

// Walrus aggregators for verification
const WALRUS_AGGREGATORS = [
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
  {
    url: 'https://aggregator.walrus-mainnet.walrus.space',
    network: 'mainnet' as const,
  },
  { url: 'https://aggregator.walrus.atalma.io', network: 'mainnet' as const },
  { url: 'https://walrus.globalstake.io', network: 'mainnet' as const },
]

interface WalcacheState {
  // Delegated state (reads from domain stores)
  blobs: Record<string, BlobResource>
  uploads: Record<string, UploadResource>
  cacheEntries: Record<string, CacheResource>
  analytics: Record<string, AnalyticsResource>
  globalAnalytics: GlobalAnalytics | null
  cacheStats: CacheStats | null

  // Legacy state
  cidStats: Record<string, CIDStats>
  globalStats: LegacyGlobalStats | null
  topCIDs: Array<CIDStats>
  cidInfo: CIDInfo | null

  // Upload state (local to this store for backward compat)
  vaults: Array<TuskyVault>
  files: Array<TuskyFile>
  uploadProgress: Record<string, UploadProgress | UploadResource>

  // Blockchain state (delegated)
  blockchainIntegrator: any
  supportedChains: Array<SupportedChain>
  verificationResults: Record<string, any>
  registrationProgress: Record<string, any>

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
  currentCID: string

  // UI Actions
  setCurrentCID: (cid: string) => void
  setError: (error: WalrusCDNError | string | null) => void
  setLoading: (loading: boolean) => void

  // v1 API Actions (delegated to blobStore)
  fetchBlob: (blobId: string) => Promise<BlobResource>
  listBlobs: (params?: any) => Promise<Array<BlobResource>>
  createUpload: (file: File, options?: any) => Promise<UploadResource>
  listUploads: (params?: any) => Promise<Array<UploadResource>>
  preloadBlobs: (blobIds: Array<string>) => Promise<void>
  pinBlob: (blobId: string) => Promise<BlobResource>
  unpinBlob: (blobId: string) => Promise<BlobResource>
  clearCacheEntries: (blobIds?: Array<string>) => Promise<void>
  fetchGlobalAnalytics: () => Promise<void>
  fetchCacheStatistics: () => Promise<void>

  // Legacy API Actions
  fetchCIDStats: (cid: string) => Promise<void>
  fetchGlobalStats: () => Promise<void>
  fetchCacheStats: () => Promise<void>
  preloadCIDs: (cids: Array<string>) => Promise<void>
  pinCID: (cid: string) => Promise<void>
  unpinCID: (cid: string) => Promise<void>
  clearCache: () => Promise<void>

  // Upload Actions
  fetchVaults: () => Promise<void>
  createVault: (name: string, description?: string) => Promise<void>
  fetchFiles: (vaultId?: string) => Promise<void>
  uploadFile: (file: File, vaultId?: string) => Promise<TuskyFile>
  deleteFile: (fileId: string) => Promise<void>

  // Direct Walrus Upload
  uploadToWalrus: (file: File) => Promise<any>

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

  // Blockchain Actions (delegated to blockchainStore)
  initializeBlockchainIntegrator: (configs: Record<SupportedChain, any>) => void
  registerBlobOnChain: (
    blobId: string,
    metadata: any,
    chain: SupportedChain,
  ) => Promise<string>
  registerBlobBatch: (
    blobs: Array<{ blobId: string; metadata: any }>,
    chain: SupportedChain,
  ) => Promise<string>
  verifyBlobOnChain: (blobId: string, chain: SupportedChain) => Promise<any>
  verifyMultiChain: (
    blobId: string,
    chains?: Array<SupportedChain>,
  ) => Promise<any>
  getBlobRegistrationStatus: (
    blobId: string,
    chain: SupportedChain,
  ) => Promise<{ registered: boolean; txHash?: string }>
  uploadAndRegisterOnChain: (
    file: File,
    chain: SupportedChain,
    vaultId?: string,
  ) => Promise<any>
}

export const useWalcacheStore = create<WalcacheState>()(
  devtools(
    (set, get) => ({
      // v1 API state (synced from blobStore)
      blobs: {},
      uploads: {},
      cacheEntries: {},
      analytics: {},
      globalAnalytics: null,
      cacheStats: null,

      // Legacy state
      cidStats: {},
      globalStats: null,
      topCIDs: [],
      cidInfo: null,

      // Upload state
      vaults: [],
      files: [],
      uploadProgress: {},

      // Blockchain state (reads from blockchainStore)
      blockchainIntegrator: null,
      supportedChains: ['ethereum', 'sui'] as Array<SupportedChain>,
      verificationResults: {},
      registrationProgress: {},

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
      setCurrentCID: (cid) => set({ currentCID: cid }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      // ========== v1 API Actions (delegate to blobStore) ==========
      fetchBlob: async (blobId) => {
        const blob = await useBlobStore.getState().fetchBlob(blobId)
        set((state) => ({ blobs: { ...state.blobs, [blobId]: blob } }))
        return blob
      },
      listBlobs: async (params?) => {
        const blobs = await useBlobStore.getState().listBlobs(params)
        const blobsMap = blobs.reduce(
          (acc, b) => {
            acc[b.id] = b
            return acc
          },
          {} as Record<string, BlobResource>,
        )
        set((state) => ({ blobs: { ...state.blobs, ...blobsMap } }))
        return blobs
      },
      createUpload: async (file, options?) => {
        const upload = await useBlobStore.getState().createUpload(file, options)
        set((state) => ({ uploads: { ...state.uploads, [upload.id]: upload } }))
        return upload
      },
      listUploads: async (params?) => {
        return useBlobStore.getState().listUploads(params)
      },
      preloadBlobs: async (blobIds) => {
        return useBlobStore.getState().preloadBlobs(blobIds)
      },
      pinBlob: async (blobId) => {
        const blob = await useBlobStore.getState().pinBlob(blobId)
        set((state) => ({ blobs: { ...state.blobs, [blobId]: blob } }))
        return blob
      },
      unpinBlob: async (blobId) => {
        const blob = await useBlobStore.getState().unpinBlob(blobId)
        set((state) => ({ blobs: { ...state.blobs, [blobId]: blob } }))
        return blob
      },
      clearCacheEntries: async (blobIds?) => {
        return useBlobStore.getState().clearCacheEntries(blobIds)
      },
      fetchGlobalAnalytics: async () => {
        await useBlobStore.getState().fetchGlobalAnalytics()
        set({ globalAnalytics: useBlobStore.getState().globalAnalytics })
      },
      fetchCacheStatistics: async () => {
        await useBlobStore.getState().fetchCacheStatistics()
        set({ cacheStats: useBlobStore.getState().cacheStats })
      },

      // ========== Legacy API Actions ==========
      fetchCIDStats: async (cid) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/stats/${cid}`, {
            headers: { 'X-API-Key': getAuthToken() },
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
            headers: { 'X-API-Key': getAuthToken() },
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

      preloadCIDs: async (cids) => {
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
            set({ error: null, isLoading: false })
          }
          get().fetchGlobalStats()
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to preload CIDs',
            isLoading: false,
          })
        }
      },

      pinCID: async (cid) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/pin/${cid}`, {
            method: 'POST',
          })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          set({ isLoading: false })
          get().fetchCIDStats(cid)
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to pin CID',
            isLoading: false,
          })
        }
      },

      unpinCID: async (cid) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/pin/${cid}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          set({ isLoading: false })
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
          get().fetchGlobalStats()
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to clear cache',
            isLoading: false,
          })
        }
      },

      // ========== Upload Actions ==========
      fetchVaults: async () => {
        set({ isLoading: true, error: null })
        try {
          const timestamp = Date.now()
          const response = await fetch(
            `${WALCACHE_BASE_URL}/upload/vaults?t=${timestamp}`,
            { cache: 'no-cache', headers: { 'Cache-Control': 'no-cache' } },
          )
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()
          set({ vaults: data.vaults, isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch vaults',
            isLoading: false,
          })
        }
      },

      createVault: async (name, description?) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${WALCACHE_BASE_URL}/upload/vaults`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': getAuthToken(),
            },
            body: JSON.stringify({ name, description }),
          })
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

      fetchFiles: async (vaultId?) => {
        set({ isLoading: true, error: null })
        try {
          const params = vaultId ? `?vaultId=${vaultId}` : ''
          const response = await fetch(
            `${WALCACHE_BASE_URL}/upload/files${params}`,
          )
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()
          set({ files: data.files, isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch files',
            isLoading: false,
          })
        }
      },

      uploadFile: async (file, vaultId?) => {
        const uploadId = Math.random().toString(36).substring(2)

        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            [uploadId]: {
              id: uploadId,
              object: 'upload_progress',
              created: Math.floor(Date.now() / 1000),
              fileName: file.name,
              filename: file.name,
              progress: 0,
              status: 'uploading',
              size: file.size,
              content_type: file.type,
            },
          },
        }))

        try {
          const formData = new FormData()
          formData.append('file', file)
          const params = vaultId ? `?vaultId=${vaultId}` : ''
          const response = await fetch(
            `${WALCACHE_BASE_URL}/upload/file${params}`,
            {
              method: 'POST',
              headers: { 'X-API-Key': getAuthToken() },
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
            uploadProgress: {
              ...state.uploadProgress,
              [uploadId]: {
                id: uploadId,
                object: 'upload_progress',
                created: Math.floor(Date.now() / 1000),
                fileName: file.name,
                filename: file.name,
                progress: 100,
                status: 'completed',
                size: file.size,
                content_type: file.type,
                blob_id: data.file.blobId,
              },
            },
            files: [...state.files, data.file],
          }))

          setTimeout(() => {
            set((state) => {
              const newUploads = { ...state.uploadProgress }
              delete newUploads[uploadId]
              return { uploadProgress: newUploads }
            })
          }, 3000)

          return data.file
        } catch (error) {
          set((state) => ({
            uploadProgress: {
              ...state.uploadProgress,
              [uploadId]: {
                id: uploadId,
                object: 'upload_progress',
                created: Math.floor(Date.now() / 1000),
                fileName: file.name,
                filename: file.name,
                progress: 0,
                status: 'error',
                size: file.size,
                content_type: file.type,
                error: error instanceof Error ? error.message : 'Upload failed',
              },
            },
          }))
          throw error
        }
      },

      deleteFile: async (fileId) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(
            `${WALCACHE_BASE_URL}/upload/files/${fileId}`,
            {
              method: 'DELETE',
              headers: { 'X-API-Key': getAuthToken() },
            },
          )
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              errorData.message ||
                `HTTP ${response.status}: ${response.statusText}`,
            )
          }
          set((state) => ({
            files: state.files.filter((f) => f.id !== fileId),
            isLoading: false,
          }))
          await get().fetchVaults()
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to delete file',
            isLoading: false,
          })
          throw error
        }
      },

      // ========== Walrus Verification ==========
      checkBlobOnWalrus: async (blobId) => {
        for (const aggregator of WALRUS_AGGREGATORS) {
          try {
            const response = await fetch(
              `${aggregator.url}/v1/blobs/${blobId}`,
              { method: 'HEAD', signal: AbortSignal.timeout(8000) },
            )
            if (response.ok) {
              return {
                available: true,
                network: aggregator.network,
                aggregator: aggregator.url,
              }
            }
          } catch {
            // Try next aggregator
          }
        }
        return { available: false }
      },

      uploadAndVerify: async (file, vaultId?) => {
        const uploadedFile = await get().uploadFile(file, vaultId)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const verification = await get().checkBlobOnWalrus(uploadedFile.blobId)
        return {
          file: uploadedFile,
          verified: verification.available,
          network: verification.network,
        }
      },

      uploadToWalrus: async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`${WALCACHE_BASE_URL}/upload/walrus`, {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`,
          )
        }
        return response.json()
      },

      uploadToWalrusAndVerify: async (file) => {
        const uploadResult = await get().uploadToWalrus(file)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        const verification = await get().checkBlobOnWalrus(uploadResult.blobId)
        return {
          upload: uploadResult,
          verified: verification.available,
          network: verification.network,
        }
      },

      // ========== Blockchain Actions (delegate to blockchainStore) ==========
      initializeBlockchainIntegrator: (configs) => {
        useBlockchainStore.getState().initializeBlockchainIntegrator(configs)
      },
      registerBlobOnChain: (blobId, metadata, chain) => {
        return useBlockchainStore
          .getState()
          .registerBlobOnChain(blobId, metadata, chain)
      },
      registerBlobBatch: (blobs, chain) => {
        return useBlockchainStore.getState().registerBlobBatch(blobs, chain)
      },
      verifyBlobOnChain: (blobId, chain) => {
        return useBlockchainStore.getState().verifyBlobOnChain(blobId, chain)
      },
      verifyMultiChain: async (blobId, chains?) => {
        const result = await useBlockchainStore
          .getState()
          .verifyMultiChain(blobId, chains)
        set((state) => ({
          verificationResults: {
            ...state.verificationResults,
            [blobId]: result,
          },
        }))
        return result
      },
      getBlobRegistrationStatus: (blobId, chain) => {
        return useBlockchainStore
          .getState()
          .getBlobRegistrationStatus(blobId, chain)
      },
      uploadAndRegisterOnChain: (file, chain, vaultId?) => {
        return useBlockchainStore
          .getState()
          .uploadAndRegisterOnChain(file, chain, vaultId)
      },
    }),
    { name: 'wcdn-store' },
  ),
)
