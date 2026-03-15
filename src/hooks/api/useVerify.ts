import { useMutation, useQuery } from '@tanstack/react-query'
import { WALCACHE_BASE_URL } from '@/config/env'

interface VerificationResult {
  verified: boolean
  chain: string
  transactionHash?: string
  uploader?: string
  timestamp?: string
}

interface CrossChainResult {
  overallVerified: boolean
  consensusLevel: string
  chains: Record<string, VerificationResult>
  trustedChains: Array<string>
}

interface AccessCheckResult {
  granted: boolean
  reason: string
}

async function verifyCrossChain(
  blobId: string,
  chains: Array<string>,
): Promise<CrossChainResult> {
  const response = await fetch(`${WALCACHE_BASE_URL}/v1/verification/cross-chain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobId, chains }),
  })

  if (!response.ok) {
    throw new Error(`Verification failed: ${response.statusText}`)
  }
  return response.json()
}

async function checkAccess(cid: string, wallet?: string): Promise<AccessCheckResult> {
  const params = wallet ? `?wallet=${wallet}` : ''
  const response = await fetch(
    `${WALCACHE_BASE_URL}/v1/access-gates/check/${cid}${params}`,
  )

  if (!response.ok) {
    throw new Error(`Access check failed: ${response.statusText}`)
  }
  return response.json()
}

export function useVerifyCrossChain() {
  return useMutation({
    mutationFn: ({
      blobId,
      chains,
    }: {
      blobId: string
      chains: Array<string>
    }) => verifyCrossChain(blobId, chains),
  })
}

export function useAccessCheck(cid: string, wallet?: string) {
  return useQuery({
    queryKey: ['access-check', cid, wallet],
    queryFn: () => checkAccess(cid, wallet),
    enabled: !!cid,
    staleTime: 30 * 1000,
  })
}
