import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WALCACHE_BASE_URL } from '@/config/env'

interface TuskyVault {
  id: string
  name: string
  description?: string
  createdAt: string
  fileCount: number
  totalSize: number
}

interface TuskyFile {
  id: string
  name: string
  size: number
  contentType: string
  blobId: string
  cdnUrl: string
  createdAt: string
  vaultId: string
}

interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

// Query keys
export const vaultKeys = {
  all: ['vaults'] as const,
  lists: () => [...vaultKeys.all, 'list'] as const,
  files: (vaultId?: string) => [...vaultKeys.all, 'files', vaultId] as const,
  uploads: () => [...vaultKeys.all, 'uploads'] as const,
}

// API functions
async function fetchVaults(): Promise<TuskyVault[]> {
  const response = await fetch(`${WALCACHE_BASE_URL}/upload/vaults`, {
    headers: {
      'X-API-Key': 'dev-secret-walcache-2024',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch vaults: ${response.statusText}`)
  }
  return response.json()
}

async function fetchFiles(vaultId?: string): Promise<TuskyFile[]> {
  const url = vaultId
    ? `${WALCACHE_BASE_URL}/upload/files?vaultId=${vaultId}`
    : `${WALCACHE_BASE_URL}/upload/files`

  const response = await fetch(url, {
    headers: {
      'X-API-Key': 'dev-secret-walcache-2024',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`)
  }
  return response.json()
}

async function createVault(
  name: string,
  description?: string,
): Promise<TuskyVault> {
  const response = await fetch(`${WALCACHE_BASE_URL}/upload/vaults`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'dev-secret-walcache-2024',
    },
    body: JSON.stringify({ name, description }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create vault: ${response.statusText}`)
  }
  return response.json()
}

async function uploadFile(file: File, vaultId: string): Promise<TuskyFile> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('vaultId', vaultId)

  const response = await fetch(`${WALCACHE_BASE_URL}/upload/file`, {
    method: 'POST',
    headers: {
      'X-API-Key': 'dev-secret-walcache-2024',
    },
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }
  return response.json()
}

async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${WALCACHE_BASE_URL}/upload/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': 'dev-secret-walcache-2024',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`)
  }
}

// React Query hooks
export function useVaults() {
  return useQuery({
    queryKey: vaultKeys.lists(),
    queryFn: fetchVaults,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useFiles(vaultId?: string) {
  return useQuery({
    queryKey: vaultKeys.files(vaultId),
    queryFn: () => fetchFiles(vaultId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateVault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string
      description?: string
    }) => createVault(name, description),
    onSuccess: () => {
      // Invalidate vaults list to refresh the data
      queryClient.invalidateQueries({ queryKey: vaultKeys.lists() })
    },
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, vaultId }: { file: File; vaultId: string }) =>
      uploadFile(file, vaultId),
    onSuccess: (_, variables) => {
      // Invalidate files query for the specific vault
      queryClient.invalidateQueries({
        queryKey: vaultKeys.files(variables.vaultId),
      })
      queryClient.invalidateQueries({ queryKey: vaultKeys.files() }) // All files
      queryClient.invalidateQueries({ queryKey: vaultKeys.lists() }) // Update vault file counts
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      // Invalidate all file and vault queries
      queryClient.invalidateQueries({ queryKey: vaultKeys.files() })
      queryClient.invalidateQueries({ queryKey: vaultKeys.lists() })
    },
  })
}
