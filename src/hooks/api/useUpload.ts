import { useMutation, useQueryClient } from '@tanstack/react-query'
import { WALCACHE_BASE_URL } from '@/config/env'

interface UploadResult {
  success: boolean
  blobId: string
  cdnUrl: string
  size: number
  contentType: string
}

async function uploadFile(
  file: File,
  options?: { vaultId?: string; apiKey?: string },
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const headers: Record<string, string> = {}
  if (options?.apiKey) {
    headers['X-API-Key'] = options.apiKey
  }

  const url = options?.vaultId
    ? `${WALCACHE_BASE_URL}/upload/file?vaultId=${options.vaultId}`
    : `${WALCACHE_BASE_URL}/upload/walrus`

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

export function useUpload(options?: { vaultId?: string; apiKey?: string }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadFile(file, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useBatchUpload(options?: { apiKey?: string }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (files: Array<File>) => {
      const results = await Promise.allSettled(
        files.map((file) => uploadFile(file, options)),
      )

      const successful = results
        .filter((r): r is PromiseFulfilledResult<UploadResult> => r.status === 'fulfilled')
        .map((r) => r.value)

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason?.message || 'Unknown error')

      return { successful, failed, total: files.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
