/**
 * @walrus/cdn - Official SDK for Walrus CDN
 *
 * Fast, reliable access to Walrus decentralized storage through WCDN
 *
 * @example
 * ```typescript
 * import { getWalrusCDNUrl, WalrusCDNClient } from '@walrus/cdn';
 *
 * // Simple URL generation
 * const url = getWalrusCDNUrl('your-blob-id', { baseUrl: 'https://cdn.yourdomain.com' });
 *
 * // Full client with advanced features
 * const client = new WalrusCDNClient({
 *   baseUrl: 'https://cdn.yourdomain.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * const info = await client.getCIDInfo('your-blob-id');
 * ```
 */

export { WalrusCDNClient } from './client.js'
export * from './types.js'

// Export multi-chain verification and optimization modules
export {
  verifierRegistry,
  SuiVerifier,
  EthereumVerifier,
  SolanaVerifier,
  VerifierRegistry,
} from './verifiers/index.js'

export {
  queryManager,
  SuiQueryEngine,
  EthereumQueryEngine,
  SolanaQueryEngine,
  QueryManager,
} from './queries/index.js'

export {
  nodeManager,
  getBestNode,
  NodeManager,
  DEFAULT_CHAIN_NODES,
} from './nodes/index.js'

// Re-export for convenience
import { WalrusCDNClient } from './client.js'
import type {
  WalrusCDNConfig,
  UrlOptions,
  SupportedChain,
  GetWalrusCDNUrlOptions,
  ChainEndpointConfig,
  AdvancedUrlOptions,
  AssetVerificationOptions,
  AssetVerificationResult,
  MultiChainVerificationResult,
  NodeSelectionResult,
} from './types.js'
import type { NodeSelectionStrategy } from './nodes/index.js'

/**
 * Default multi-chain Walrus aggregator endpoints
 */
const WALRUS_AGGREGATOR_ENDPOINTS: Record<SupportedChain, ChainEndpointConfig> =
  {
    sui: {
      primary: 'https://aggregator.walrus-testnet.walrus.space',
      fallbacks: [
        'https://aggregator.testnet.walrus.atalma.io',
        'https://sui-walrus-tn-aggregator.bwarelabs.com',
      ],
      status: 'active',
    },
    ethereum: {
      primary: 'https://eth-aggregator.walrus.space', // mock endpoint for hackathon
      fallbacks: ['https://eth-backup.walrus.space'],
      status: 'mock',
    },
    solana: {
      primary: 'https://sol-aggregator.walrus.space', // mock endpoint for hackathon
      fallbacks: ['https://sol-backup.walrus.space'],
      status: 'mock',
    },
  }

/**
 * Default CDN client instance for simple usage
 */
let defaultClient: WalrusCDNClient | null = null

/**
 * Configure the default CDN client
 * @param config - Configuration for the default client
 */
export function configure(config: WalrusCDNConfig): void {
  defaultClient = new WalrusCDNClient(config)
}

/**
 * Generate a Walrus CDN URL for a given blob ID
 * This is the main convenience function for frontend developers
 *
 * @param blobId - The Walrus blob ID (CID)
 * @param config - CDN configuration (baseUrl is required if not using configure())
 * @param options - Additional URL options
 * @returns The full CDN URL
 *
 * @example
 * ```typescript
 * // With inline config
 * const url = getCDNUrl('bafybeig...', {
 *   baseUrl: 'https://cdn.yourdomain.com'
 * });
 *
 * // With pre-configured client
 * configure({ baseUrl: 'https://cdn.yourdomain.com' });
 * const url = getCDNUrl('bafybeig...');
 * ```
 */
export function getCDNUrl(
  blobId: string,
  config?: WalrusCDNConfig,
  options?: UrlOptions,
): string {
  // Use provided config or default client
  if (config) {
    const client = new WalrusCDNClient(config)
    return client.getCDNUrl(blobId, options)
  }

  if (!defaultClient) {
    throw new Error(
      'No CDN configuration found. Either pass config as second parameter or call configure() first.',
    )
  }

  return defaultClient.getCDNUrl(blobId, options)
}

/**
 * Generate a multi-chain Walrus CDN URL for a given blob ID
 *
 * 🚀 One-line function to get CDN URLs for any supported blockchain
 *
 * @param blobId - The Walrus blob ID (CID)
 * @param options - Chain selection and endpoint options
 * @returns Direct aggregator URL for the specified chain
 *
 * @example
 * ```typescript
 * import { getWalrusCDNUrl } from 'wcdn-sdk';
 *
 * // Sui (default)
 * const suiUrl = getWalrusCDNUrl('your-blob-id', { chain: 'sui' });
 * // => https://aggregator.walrus-testnet.walrus.space/v1/blobs/your-blob-id
 *
 * // Ethereum
 * const ethUrl = getWalrusCDNUrl('your-blob-id', { chain: 'ethereum' });
 * // => https://eth-aggregator.walrus.space/v1/blobs/your-blob-id
 *
 * // Solana
 * const solUrl = getWalrusCDNUrl('your-blob-id', { chain: 'solana' });
 * // => https://sol-aggregator.walrus.space/v1/blobs/your-blob-id
 *
 * // Custom endpoint
 * const customUrl = getWalrusCDNUrl('your-blob-id', {
 *   customEndpoint: 'https://my-custom-aggregator.com'
 * });
 * ```
 */
export function getWalrusCDNUrl(
  blobId: string,
  options?: GetWalrusCDNUrlOptions,
): string {
  // Use custom endpoint if provided
  if (options?.customEndpoint) {
    let url = `${options.customEndpoint}/v1/blobs/${blobId}`
    if (options.params) {
      const searchParams = new URLSearchParams(options.params)
      url += `?${searchParams.toString()}`
    }
    return url
  }

  // Default to 'sui' if no chain specified
  const chain = options?.chain ?? 'sui'

  // Get endpoint configuration for the chain
  const chainConfig = WALRUS_AGGREGATOR_ENDPOINTS[chain]
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`)
  }

  // Use primary endpoint
  const endpoint = chainConfig.primary

  // Walrus aggregator API: /v1/blobs/:blobId
  let url = `${endpoint}/v1/blobs/${blobId}`
  
  // Add query parameters if provided
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params)
    url += `?${searchParams.toString()}`
  }
  
  return url
}

/**
 * Advanced multi-chain CDN URL generation with asset verification and optimization
 *
 * 🚀 One-line function with built-in asset verification and node optimization
 *
 * @param blobId - The Walrus blob ID (CID)
 * @param options - Advanced options including verification and optimization
 * @returns Promise with optimized CDN URL and verification result
 *
 * @example
 * ```typescript
 * import { getAdvancedWalrusCDNUrl } from 'wcdn-sdk';
 *
 * // With asset verification
 * const result = await getAdvancedWalrusCDNUrl('your-blob-id', {
 *   chain: 'ethereum',
 *   verification: {
 *     userAddress: '0x1234...',
 *     assetId: '123',
 *     contractAddress: '0xABC...'
 *   }
 * });
 * // => { url: '...', verification: {...}, nodeSelection: {...} }
 *
 * // With node optimization
 * const optimized = await getAdvancedWalrusCDNUrl('your-blob-id', {
 *   chain: 'sui',
 *   nodeSelectionStrategy: 'fastest',
 *   skipVerification: true
 * });
 * ```
 */
export async function getAdvancedWalrusCDNUrl(
  blobId: string,
  options: AdvancedUrlOptions & { baseUrl: string },
): Promise<{ url: string; verification?: AssetVerificationResult; nodeSelection?: NodeSelectionResult }> {
  const client = new WalrusCDNClient({ baseUrl: options.baseUrl })
  return await client.getAdvancedCDNUrl(blobId, options)
}

/**
 * Get the default client instance (must call configure() first)
 * @returns The configured default client
 */
export function getDefaultClient(): WalrusCDNClient {
  if (!defaultClient) {
    throw new Error('No default client configured. Call configure() first.')
  }
  return defaultClient
}

/**
 * Convenience functions that use the default client
 */

/**
 * Get information about a CID using the default client
 */
export async function getCIDInfo(blobId: string) {
  return getDefaultClient().getCIDInfo(blobId)
}

/**
 * Upload a file using the default client
 */
export async function uploadFile(file: File | Blob, vaultId?: string) {
  return getDefaultClient().uploadFile(file, vaultId)
}

/**
 * Preload CIDs using the default client
 */
export async function preloadCIDs(cids: string[]) {
  return getDefaultClient().preloadCIDs(cids)
}

/**
 * Pin a CID using the default client
 */
export async function pinCID(blobId: string) {
  return getDefaultClient().pinCID(blobId)
}

/**
 * Unpin a CID using the default client
 */
export async function unpinCID(blobId: string) {
  return getDefaultClient().unpinCID(blobId)
}

/**
 * Get metrics using the default client
 */
export async function getMetrics() {
  return getDefaultClient().getMetrics()
}

/**
 * Health check using the default client
 */
export async function healthCheck() {
  return getDefaultClient().healthCheck()
}

/**
 * Multi-chain convenience functions using the default client
 */

/**
 * Verify asset ownership using the default client
 * @param chain - Target blockchain
 * @param options - Verification options
 * @returns Promise with verification result
 */
export async function verifyAsset(
  chain: SupportedChain,
  options: AssetVerificationOptions,
): Promise<AssetVerificationResult> {
  return getDefaultClient().verifyAsset(chain, options)
}

/**
 * Verify asset across multiple chains using the default client
 * @param chains - Target blockchains
 * @param options - Verification options
 * @returns Promise with multi-chain verification result
 */
export async function verifyMultiChain(
  chains: SupportedChain[],
  options: AssetVerificationOptions,
): Promise<MultiChainVerificationResult> {
  return getDefaultClient().verifyMultiChain(chains, options)
}

/**
 * Get multi-chain blob status using the default client
 * @param blobId - The Walrus blob ID
 * @param chains - Target blockchains (optional)
 * @returns Promise with multi-chain blob status
 */
export async function getMultiChainBlobStatus(
  blobId: string,
  chains?: SupportedChain[],
) {
  return getDefaultClient().getMultiChainBlobStatus(blobId, chains)
}

/**
 * Select optimal node using the default client
 * @param chain - Target blockchain
 * @param strategy - Node selection strategy
 * @param network - Network type
 * @returns Promise with node selection result
 */
export async function selectOptimalNode(
  chain: SupportedChain,
  strategy: NodeSelectionStrategy = 'fastest',
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
): Promise<NodeSelectionResult> {
  return getDefaultClient().selectOptimalNode(chain, strategy, network)
}

/**
 * Perform health check on nodes using the default client
 * @param chain - Target blockchain (optional, defaults to all)
 * @returns Promise that resolves when health check is complete
 */
export async function healthCheckNodes(chain?: SupportedChain): Promise<void> {
  return getDefaultClient().healthCheckNodes(chain)
}

/**
 * Generate multi-chain optimized CDN URL using the default client
 * @param blobId - The Walrus blob ID
 * @param options - Multi-chain URL options
 * @returns The optimized CDN URL
 */
export function getMultiChainCDNUrl(
  blobId: string,
  options: { chain?: SupportedChain; params?: Record<string, string> } = {},
): string {
  return getDefaultClient().getMultiChainCDNUrl(blobId, options)
}

/**
 * Get available chains and their endpoint configurations
 * @returns Object with chain configurations
 */
export function getAvailableChains(): Record<
  SupportedChain,
  ChainEndpointConfig
> {
  return { ...WALRUS_AGGREGATOR_ENDPOINTS }
}

/**
 * Get endpoint for a specific chain
 * @param chain - Target blockchain network
 * @param preferFallback - Use fallback endpoint instead of primary
 * @returns Aggregator endpoint URL
 */
export function getChainEndpoint(
  chain: SupportedChain,
  preferFallback = false,
): string {
  const chainConfig = WALRUS_AGGREGATOR_ENDPOINTS[chain]
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`)
  }

  if (
    preferFallback &&
    chainConfig.fallbacks &&
    chainConfig.fallbacks.length > 0
  ) {
    return chainConfig.fallbacks[0]
  }

  return chainConfig.primary
}

/**
 * Check if a chain is supported
 * @param chain - Chain to check
 * @returns True if chain is supported
 */
export function isSupportedChain(chain: string): chain is SupportedChain {
  return chain in WALRUS_AGGREGATOR_ENDPOINTS
}

/**
 * Get blob status across all supported chains (enhanced version)
 * @param blobId - Blob ID to check
 * @param chains - Specific chains to check (optional)
 * @returns Multi-chain blob status
 */
export async function getBlobStatus(
  blobId: string, 
  chains?: SupportedChain[]
): Promise<any> {
  if (defaultClient) {
    return defaultClient.getMultiChainBlobStatus(blobId, chains)
  }
  
  // Fallback to mock implementation for backward compatibility
  const targetChains = chains || ['sui', 'ethereum', 'solana']
  const mockStatus = {
    blobId,
    chains: {} as Record<SupportedChain, any>,
    summary: {
      availableChains: [] as SupportedChain[],
      totalChains: targetChains.length,
      bestChain: undefined as SupportedChain | undefined,
    },
  }

  targetChains.forEach(chain => {
    const exists = chain === 'sui' ? true : Math.random() > 0.3
    mockStatus.chains[chain] = {
      exists,
      chain,
      endpoint: WALRUS_AGGREGATOR_ENDPOINTS[chain].primary,
      lastChecked: new Date(),
      latency: chain === 'sui' ? 150 : chain === 'ethereum' ? 300 : 250,
      metadata: { 
        network: chain === 'sui' ? 'testnet' : 'mock', 
        status: chain === 'sui' ? 'active' : 'experimental' 
      },
    }
  })

  // Calculate available chains
  mockStatus.summary.availableChains = Object.entries(mockStatus.chains)
    .filter(([_, status]) => status.exists)
    .map(([chain, _]) => chain as SupportedChain)
    
  mockStatus.summary.bestChain = mockStatus.summary.availableChains[0]

  return mockStatus
}

// Export uploader functions (conditional - only if uploader module exists)
try {
  const uploaderModule = await import('./uploader.js')
  
  export const {
    uploadToWalrusWithCache,
    uploadAndGetInstantUrl,
    getCacheStatus,
    getCachedContent,
    preloadToCache,
  } = uploaderModule
} catch (error) {
  // Uploader module not available - skip export
  console.warn('Uploader module not available:', error)
}

// Export uploader types (conditional)
try {
  const uploaderTypes = await import('./uploader.js')
  export type { UploadOptions, UploadResult, CacheStatus } from './uploader.js'
} catch (error) {
  // Types not available
}

// Version information
export const version = '1.0.0'
