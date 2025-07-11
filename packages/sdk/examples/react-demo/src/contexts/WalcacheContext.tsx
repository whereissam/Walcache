import React, { createContext, useContext, useState, useCallback } from 'react'

export type SupportedChain = 'ethereum' | 'sui' | 'solana'

interface WalcacheContextType {
  selectedChain: SupportedChain
  setSelectedChain: (chain: SupportedChain) => void
  uploadAsset: (file: File, options: UploadOptions) => Promise<UploadResult>
  getAssetInfo: (assetId: string) => Promise<AssetInfoResult>
  generateUrls: (blobId: string, params?: Record<string, string>) => Promise<UrlResult>
  verifyOwnership: (data: VerificationData) => Promise<VerificationResult>
  getMetrics: () => Promise<MetricsResult>
  loading: boolean
}

interface UploadOptions {
  chain: SupportedChain
  name?: string
  description?: string
  createNFT?: boolean
  permanent?: boolean
}

interface UploadResult {
  success: boolean
  data?: {
    id: string
    chain: string
    cdnUrl: string
    transactionHash?: string
    contractAddress?: string
    tokenId?: string
    cdnUrls?: Record<string, string>
  }
  error?: string
}

interface AssetInfoResult {
  success: boolean
  data?: {
    id: string
    cached: boolean
    pinned: boolean
    cdnUrl: string
    stats?: {
      requests: number
      hitRate: number
      avgLatency: number
    }
    multiChain?: {
      chains: Record<string, { exists: boolean; latency?: number }>
    }
  }
  error?: string
}

interface UrlResult {
  success: boolean
  cdnUrl?: string
  error?: string
}

interface VerificationData {
  userAddress: string
  assetId: string
  chain: SupportedChain
}

interface VerificationResult {
  success: boolean
  data?: {
    hasAccess: boolean
    chain: string
    verifiedAt: string
    assetMetadata?: {
      name?: string
      description?: string
    }
  }
  error?: string
}

interface MetricsResult {
  success: boolean
  data?: {
    cdn: {
      global: {
        totalRequests: number
        globalHitRate: number
        avgLatency: number
        uniqueCIDs: number
      }
      cache: {
        using: string
      }
    }
    service: {
      uptime: number
      memory: {
        heapUsed: number
      }
    }
    network: {
      optimalNode: string
    }
  }
  error?: string
}

const WalcacheContext = createContext<WalcacheContextType | undefined>(undefined)

const API_BASE = '/api' // Proxied through Vite to backend

export function WalcacheProvider({ children }: { children: React.ReactNode }) {
  const [selectedChain, setSelectedChain] = useState<SupportedChain>('sui')
  const [loading, setLoading] = useState(false)

  const uploadAsset = useCallback(async (file: File, options: UploadOptions): Promise<UploadResult> => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chain', options.chain)
      formData.append('name', options.name || file.name)
      formData.append('description', options.description || '')
      formData.append('createNFT', String(options.createNFT || false))
      formData.append('permanent', String(options.permanent || false))

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      return result
    } catch (error: any) {
      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const getAssetInfo = useCallback(async (assetId: string): Promise<AssetInfoResult> => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/asset/${assetId}?multichain=true`)
      const result = await response.json()
      return result
    } catch (error: any) {
      return { 
        success: false, 
        error: `Failed to get asset info: ${error.message}` 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const generateUrls = useCallback(async (blobId: string, params?: Record<string, string>): Promise<UrlResult> => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams(params)
      const response = await fetch(`${API_BASE}/cdn/${blobId}?${queryParams}`)
      const result = await response.json()
      return { success: true, cdnUrl: result.cdnUrl }
    } catch (error: any) {
      return { 
        success: false, 
        error: `Failed to generate URLs: ${error.message}` 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyOwnership = useCallback(async (data: VerificationData): Promise<VerificationResult> => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      return result
    } catch (error: any) {
      return { 
        success: false, 
        error: `Verification failed: ${error.message}` 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const getMetrics = useCallback(async (): Promise<MetricsResult> => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/metrics`)
      const result = await response.json()
      return result
    } catch (error: any) {
      return { 
        success: false, 
        error: `Failed to load metrics: ${error.message}` 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const value: WalcacheContextType = {
    selectedChain,
    setSelectedChain,
    uploadAsset,
    getAssetInfo,
    generateUrls,
    verifyOwnership,
    getMetrics,
    loading,
  }

  return (
    <WalcacheContext.Provider value={value}>
      {children}
    </WalcacheContext.Provider>
  )
}

export function useWalcache() {
  const context = useContext(WalcacheContext)
  if (context === undefined) {
    throw new Error('useWalcache must be used within a WalcacheProvider')
  }
  return context
}

export type { UploadOptions, UploadResult, AssetInfoResult, UrlResult, VerificationData, VerificationResult, MetricsResult }