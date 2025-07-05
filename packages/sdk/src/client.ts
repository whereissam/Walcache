import type {
  WalrusCDNConfig,
  CIDInfo,
  UploadResponse,
  PreloadResult,
  GlobalMetrics,
  UrlOptions,
  SupportedChain,
  AdvancedUrlOptions,
  AssetVerificationOptions,
  AssetVerificationResult,
  MultiChainVerificationResult,
  MultichainBlobStatus,
  AssetQueryOptions,
  AssetQueryResult,
  NodeSelectionResult,
} from './types.js'
import { WalrusCDNError } from './types.js'
import { verifierRegistry } from './verifiers/index.js'
import { queryManager } from './queries/index.js'
import { nodeManager, type NodeSelectionStrategy } from './nodes/index.js'

/**
 * Walrus CDN Client - Core functionality for interacting with WCDN
 */
export class WalrusCDNClient {
  private config: Required<WalrusCDNConfig>

  constructor(config: WalrusCDNConfig) {
    // Validate required config
    if (!config.baseUrl) {
      throw new WalrusCDNError('baseUrl is required in WalrusCDNConfig')
    }

    // Set defaults and normalize baseUrl
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      secure: config.secure !== false, // Default to true
      chainEndpoints: config.chainEndpoints || {},
    }

    // Ensure HTTPS if secure is true
    if (this.config.secure && this.config.baseUrl.startsWith('http://')) {
      this.config.baseUrl = this.config.baseUrl.replace('http://', 'https://')
    }
  }

  /**
   * Generate a CDN URL for a given Walrus blob ID
   * @param blobId - The Walrus blob ID (CID)
   * @param options - Additional options for URL generation
   * @returns The full CDN URL
   */
  getCDNUrl(blobId: string, options: UrlOptions = {}): string {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    const endpoint = options.useDownload ? '/upload/files' : '/cdn'
    let url = `${this.config.baseUrl}${endpoint}/${blobId}`

    // Add query parameters
    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams(options.params)
      url += `?${searchParams.toString()}`
    }

    return url
  }

  /**
   * Generate a multi-chain optimized CDN URL (simplified version)
   * @param blobId - The Walrus blob ID
   * @param options - Multi-chain URL options
   * @returns The optimized CDN URL
   */
  getMultiChainCDNUrl(blobId: string, options: { chain?: SupportedChain; params?: Record<string, string> } = {}): string {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    const chain = options.chain || 'sui'
    const params = { chain, ...options.params }
    
    return this.getCDNUrl(blobId, { params })
  }

  /**
   * Get information about a specific CID including cache status and stats
   * @param blobId - The Walrus blob ID
   * @returns Promise with CID information
   */
  async getCIDInfo(blobId: string): Promise<CIDInfo> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    try {
      const response = await this.makeRequest(`/api/stats/${blobId}`)
      return response
    } catch (error) {
      throw this.handleError(error, `Failed to get CID info for ${blobId}`)
    }
  }

  /**
   * Upload a file to Walrus via the CDN
   * @param file - File to upload (File or Blob)
   * @param vaultId - Optional vault ID for organization
   * @returns Promise with upload response
   */
  async uploadFile(
    file: File | Blob,
    vaultId?: string,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new WalrusCDNError('file is required')
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      let url = '/upload/file'
      if (vaultId) {
        url += `?vaultId=${encodeURIComponent(vaultId)}`
      }

      const response = await this.makeRequest(url, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      })

      return response
    } catch (error) {
      throw this.handleError(error, 'Failed to upload file')
    }
  }

  /**
   * Preload multiple CIDs into the cache
   * @param cids - Array of blob IDs to preload
   * @returns Promise with preload results
   */
  async preloadCIDs(cids: string[]): Promise<PreloadResult> {
    if (!Array.isArray(cids) || cids.length === 0) {
      throw new WalrusCDNError('cids must be a non-empty array')
    }

    try {
      const response = await this.makeRequest('/api/preload', {
        method: 'POST',
        body: JSON.stringify({ cids }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return response
    } catch (error) {
      throw this.handleError(error, 'Failed to preload CIDs')
    }
  }

  /**
   * Pin a CID to prevent it from being evicted from cache
   * @param blobId - The blob ID to pin
   * @returns Promise that resolves when pinned
   */
  async pinCID(blobId: string): Promise<void> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    try {
      await this.makeRequest(`/api/pin/${blobId}`, {
        method: 'POST',
      })
    } catch (error) {
      throw this.handleError(error, `Failed to pin CID ${blobId}`)
    }
  }

  /**
   * Unpin a CID to allow it to be evicted from cache
   * @param blobId - The blob ID to unpin
   * @returns Promise that resolves when unpinned
   */
  async unpinCID(blobId: string): Promise<void> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    try {
      await this.makeRequest(`/api/pin/${blobId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      throw this.handleError(error, `Failed to unpin CID ${blobId}`)
    }
  }

  /**
   * Get global CDN metrics and performance statistics
   * @returns Promise with global metrics
   */
  async getMetrics(): Promise<GlobalMetrics> {
    try {
      const response = await this.makeRequest('/api/metrics')
      return response
    } catch (error) {
      throw this.handleError(error, 'Failed to get metrics')
    }
  }

  /**
   * Clear the entire cache
   * @returns Promise that resolves when cache is cleared
   */
  async clearCache(): Promise<void> {
    try {
      await this.makeRequest('/api/cache/clear', {
        method: 'POST',
      })
    } catch (error) {
      throw this.handleError(error, 'Failed to clear cache')
    }
  }

  /**
   * Check if the CDN service is healthy and accessible
   * @returns Promise that resolves to true if healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/api/health')
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Generate an advanced multi-chain CDN URL with asset verification
   * @param blobId - The Walrus blob ID
   * @param options - Advanced options including verification and optimization
   * @returns Promise with the optimized CDN URL
   */
  async getAdvancedCDNUrl(
    blobId: string,
    options: AdvancedUrlOptions = {},
  ): Promise<{ url: string; verification?: AssetVerificationResult; nodeSelection?: NodeSelectionResult }> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    const chain = options.chain || 'sui'
    const skipVerification = options.skipVerification || false
    let verificationResult: AssetVerificationResult | undefined

    // Perform asset verification if requested
    if (!skipVerification && options.verification) {
      try {
        verificationResult = await this.verifyAsset(chain, options.verification)
        if (!verificationResult.hasAccess) {
          throw new WalrusCDNError(
            `Asset verification failed: ${verificationResult.error || 'Access denied'}`,
            'VERIFICATION_FAILED'
          )
        }
      } catch (error) {
        if (error instanceof WalrusCDNError) throw error
        throw new WalrusCDNError(
          `Asset verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VERIFICATION_ERROR'
        )
      }
    }

    // Select optimal node
    const strategy = options.nodeSelectionStrategy || 'fastest'
    const network = chain === 'ethereum' ? 'mainnet' : 'mainnet' // Can be configured
    let nodeSelection: NodeSelectionResult | undefined

    try {
      nodeSelection = await nodeManager.selectNode(chain, strategy, network)
    } catch (error) {
      // Fallback to default CDN URL if node selection fails
      console.warn('Node selection failed, falling back to default CDN:', error)
    }

    // Generate CDN URL
    let url: string
    if (nodeSelection) {
      // Use chain-specific endpoint
      url = `${this.config.baseUrl}/cdn/${blobId}`
      if (options.params) {
        const searchParams = new URLSearchParams(options.params)
        url += `?${searchParams.toString()}`
      }
      // Add chain parameter to help CDN route to optimal aggregator
      const separator = url.includes('?') ? '&' : '?'
      url += `${separator}chain=${chain}`
    } else {
      // Use standard URL generation
      url = this.getCDNUrl(blobId, { params: { chain, ...options.params } })
    }

    return {
      url,
      verification: verificationResult,
      nodeSelection,
    }
  }

  /**
   * Verify asset ownership on a specific blockchain
   * @param chain - Target blockchain
   * @param options - Verification options
   * @returns Promise with verification result
   */
  async verifyAsset(
    chain: SupportedChain,
    options: AssetVerificationOptions,
  ): Promise<AssetVerificationResult> {
    try {
      return await verifierRegistry.verifyAsset(chain, options)
    } catch (error) {
      throw this.handleError(error, `Failed to verify asset on ${chain}`)
    }
  }

  /**
   * Verify asset across multiple chains
   * @param chains - Target blockchains
   * @param options - Verification options
   * @returns Promise with multi-chain verification result
   */
  async verifyMultiChain(
    chains: SupportedChain[],
    options: AssetVerificationOptions,
  ): Promise<MultiChainVerificationResult> {
    try {
      const results = await Promise.allSettled(
        chains.map(chain => this.verifyAsset(chain, options))
      )

      const verificationResults: Partial<Record<SupportedChain, AssetVerificationResult>> = {}
      let primaryResult: AssetVerificationResult | undefined
      let hasAccess = false

      results.forEach((result, index) => {
        const chain = chains[index]
        if (result.status === 'fulfilled') {
          verificationResults[chain] = result.value
          if (!primaryResult || result.value.hasAccess) {
            primaryResult = result.value
          }
          if (result.value.hasAccess) {
            hasAccess = true
          }
        } else {
          verificationResults[chain] = {
            hasAccess: false,
            chain,
            verifiedAt: new Date(),
            error: result.reason?.message || 'Verification failed',
          }
        }
      })

      if (!primaryResult) {
        primaryResult = {
          hasAccess: false,
          chain: chains[0],
          verifiedAt: new Date(),
          error: 'All verifications failed',
        }
      }

      return {
        primary: primaryResult,
        crossChain: verificationResults as Record<SupportedChain, AssetVerificationResult>,
        hasAccess,
        recommendedEndpoint: hasAccess
          ? `${this.config.baseUrl}/cdn/` // Can be optimized based on best performing chain
          : undefined,
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to perform multi-chain verification')
    }
  }

  /**
   * Query asset information from smart contracts
   * @param chain - Target blockchain
   * @param options - Query options
   * @returns Promise with asset query result
   */
  async queryAsset(
    chain: SupportedChain,
    options: AssetQueryOptions,
  ): Promise<AssetQueryResult> {
    try {
      return await queryManager.queryAsset(chain, options)
    } catch (error) {
      throw this.handleError(error, `Failed to query asset on ${chain}`)
    }
  }

  /**
   * Query blob status across multiple chains
   * @param blobId - The Walrus blob ID
   * @param chains - Target blockchains (optional, defaults to all supported)
   * @returns Promise with multi-chain blob status
   */
  async getMultiChainBlobStatus(
    blobId: string,
    chains?: SupportedChain[],
  ): Promise<MultichainBlobStatus> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required')
    }

    const targetChains = chains || ['sui', 'ethereum', 'solana']
    const chainResults: Partial<Record<SupportedChain, any>> = {}

    try {
      // Check blob availability on each chain's aggregators
      const results = await Promise.allSettled(
        targetChains.map(async (chain) => {
          const nodeSelection = await nodeManager.selectNode(chain, 'fastest')
          const startTime = Date.now()
          
          try {
            const response = await fetch(`${nodeSelection.node.url}/v1/blobs/${blobId}`, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000),
            })
            
            const latency = Date.now() - startTime
            
            return {
              chain,
              exists: response.ok,
              endpoint: nodeSelection.node.url,
              lastChecked: new Date(),
              latency,
              metadata: {
                network: nodeSelection.node.network,
                status: response.status,
              },
            }
          } catch (error) {
            return {
              chain,
              exists: false,
              endpoint: nodeSelection.node.url,
              lastChecked: new Date(),
              latency: Date.now() - startTime,
              metadata: {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            }
          }
        })
      )

      results.forEach((result, index) => {
        const chain = targetChains[index]
        if (result.status === 'fulfilled') {
          chainResults[chain] = result.value
        } else {
          chainResults[chain] = {
            chain,
            exists: false,
            endpoint: 'unknown',
            lastChecked: new Date(),
            metadata: {
              error: result.reason?.message || 'Check failed',
            },
          }
        }
      })

      const availableChains = targetChains.filter(
        chain => chainResults[chain]?.exists
      )
      
      // Find best performing chain
      let bestChain: SupportedChain | undefined
      let bestLatency = Infinity
      
      availableChains.forEach(chain => {
        const result = chainResults[chain]
        if (result?.latency && result.latency < bestLatency) {
          bestLatency = result.latency
          bestChain = chain
        }
      })

      return {
        blobId,
        chains: chainResults as Record<SupportedChain, any>,
        summary: {
          availableChains,
          totalChains: targetChains.length,
          bestChain,
        },
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to get multi-chain blob status')
    }
  }

  /**
   * Select optimal node for a specific chain
   * @param chain - Target blockchain
   * @param strategy - Node selection strategy
   * @param network - Network type
   * @returns Promise with node selection result
   */
  async selectOptimalNode(
    chain: SupportedChain,
    strategy: NodeSelectionStrategy = 'fastest',
    network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
  ): Promise<NodeSelectionResult> {
    try {
      return await nodeManager.selectNode(chain, strategy, network)
    } catch (error) {
      throw this.handleError(error, `Failed to select node for ${chain}`)
    }
  }

  /**
   * Perform health check on all chain nodes
   * @param chain - Target blockchain (optional, defaults to all)
   * @returns Promise that resolves when health check is complete
   */
  async healthCheckNodes(chain?: SupportedChain): Promise<void> {
    try {
      if (chain) {
        await nodeManager.healthCheckChain(chain)
      } else {
        const chains: SupportedChain[] = ['sui', 'ethereum', 'solana']
        await Promise.all(chains.map(c => nodeManager.healthCheckChain(c)))
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to perform node health check')
    }
  }

  /**
   * Make an HTTP request to the CDN API
   * @private
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      ...this.config.headers,
    }

    // Add API key if available
    if (this.config.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    // Add timeout using AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    requestOptions.signal = controller.signal

    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new WalrusCDNError(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status,
          errorData,
        )
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WalrusCDNError(
          `Request timeout after ${this.config.timeout}ms`,
          'TIMEOUT_ERROR',
        )
      }

      // Re-throw WalrusCDNError as-is
      if (error instanceof WalrusCDNError) {
        throw error
      }

      // Handle network errors
      throw new WalrusCDNError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
      )
    }
  }

  /**
   * Handle and normalize errors
   * @private
   */
  private handleError(error: any, defaultMessage: string): WalrusCDNError {
    if (error instanceof WalrusCDNError) {
      return error
    }

    return new WalrusCDNError(
      error?.message || defaultMessage,
      error?.code || 'UNKNOWN_ERROR',
      error?.status,
      error,
    )
  }
}
