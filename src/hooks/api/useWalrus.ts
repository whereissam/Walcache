import { useMutation } from '@tanstack/react-query'
import { WALCACHE_BASE_URL } from '@/config/env'

interface WalrusCheckResult {
  available: boolean
  network?: 'testnet' | 'mainnet'
  aggregator?: string
}

// API function to check blob on Walrus
async function checkBlobOnWalrus(blobId: string): Promise<WalrusCheckResult> {
  const response = await fetch(
    `${WALCACHE_BASE_URL}/api/walrus/check/${blobId}`,
    {
      headers: {
        'X-API-Key': localStorage.getItem('auth-storage')
          ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state
              ?.token || ''
          : '',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to check blob on Walrus: ${response.statusText}`)
  }

  return response.json()
}

// React Query hook
export function useCheckBlobOnWalrus() {
  return useMutation({
    mutationFn: checkBlobOnWalrus,
  })
}
