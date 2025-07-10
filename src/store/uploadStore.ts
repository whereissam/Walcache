import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface TuskyVault {
  id: string
  name: string
  description?: string
  createdAt: string
  fileCount: number
  totalSize: number
}

export interface TuskyFile {
  id: string
  name: string
  size: number
  contentType: string
  blobId: string
  cdnUrl: string
  createdAt: string
  vaultId: string
}

export interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

interface UploadState {
  // Data
  vaults: TuskyVault[]
  files: TuskyFile[]
  uploads: Record<string, UploadProgress>

  // UI State
  isLoading: boolean
  error: string | null

  // Actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void

  // API Actions
  fetchVaults: () => Promise<void>
  createVault: (name: string, description?: string) => Promise<void>
  fetchFiles: (vaultId?: string) => Promise<void>
  uploadFile: (file: File, vaultId?: string) => Promise<TuskyFile>
  deleteFile: (fileId: string) => Promise<void>

  // Upload progress tracking
  addUpload: (upload: UploadProgress) => void
  updateUpload: (id: string, progress: Partial<UploadProgress>) => void
  removeUpload: (id: string) => void
}

const API_BASE = 'http://localhost:4500'

// Helper function to get authentication token
const getAuthToken = () => {
  const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  return authStore.state?.token || 'dev-secret-wcdn-2024'
}

export const useUploadStore = create<UploadState>()(
  devtools(
    (set, get) => ({
      // Initial state
      vaults: [],
      files: [],
      uploads: {},
      isLoading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Upload progress actions
      addUpload: (upload) =>
        set((state) => ({
          uploads: { ...state.uploads, [upload.id]: upload },
        })),

      updateUpload: (id, progress) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], ...progress },
          },
        })),

      removeUpload: (id) =>
        set((state) => {
          const { [id]: removed, ...uploads } = state.uploads
          return { uploads }
        }),

      // API Actions
      fetchVaults: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/upload/vaults`, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to fetch vaults: ${response.statusText}`)
          }
          const vaults = await response.json()
          set({ vaults, isLoading: false })
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
          const response = await fetch(`${API_BASE}/upload/vaults`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': getAuthToken(),
            },
            body: JSON.stringify({ name, description }),
          })
          if (!response.ok) {
            throw new Error(`Failed to create vault: ${response.statusText}`)
          }

          // Refresh vaults list
          await get().fetchVaults()
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
          const url = vaultId
            ? `${API_BASE}/upload/files?vaultId=${vaultId}`
            : `${API_BASE}/upload/files`

          const response = await fetch(url, {
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`)
          }
          const files = await response.json()
          set({ files, isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to fetch files',
            isLoading: false,
          })
        }
      },

      uploadFile: async (file: File, vaultId?: string) => {
        const uploadId = Math.random().toString(36).substr(2, 9)

        // Add upload progress tracking
        get().addUpload({
          id: uploadId,
          fileName: file.name,
          progress: 0,
          status: 'uploading',
        })

        try {
          const formData = new FormData()
          formData.append('file', file)
          if (vaultId) {
            formData.append('vaultId', vaultId)
          }

          const response = await fetch(`${API_BASE}/upload/file`, {
            method: 'POST',
            headers: {
              'X-API-Key': getAuthToken(),
            },
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`)
          }

          const result = await response.json()

          // Update upload progress
          get().updateUpload(uploadId, {
            progress: 100,
            status: 'completed',
          })

          // Refresh files and vaults
          await get().fetchFiles(vaultId)
          await get().fetchVaults()

          // Remove upload after delay
          setTimeout(() => get().removeUpload(uploadId), 3000)

          return result
        } catch (error) {
          get().updateUpload(uploadId, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          })
          throw error
        }
      },

      deleteFile: async (fileId: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE}/upload/files/${fileId}`, {
            method: 'DELETE',
            headers: {
              'X-API-Key': getAuthToken(),
            },
          })
          if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.statusText}`)
          }

          // Refresh files and vaults
          await get().fetchFiles()
          await get().fetchVaults()

          set({ isLoading: false })
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to delete file',
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'upload-store',
    },
  ),
)
