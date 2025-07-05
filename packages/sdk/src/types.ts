/**
 * Supported blockchain networks for multi-chain Walrus CDN
 */
export type SupportedChain = 'sui' | 'ethereum' | 'solana'

/**
 * Chain endpoint configuration
 */
export interface ChainEndpointConfig {
  /** Primary aggregator endpoint */
  primary: string
  /** Fallback aggregator endpoints */
  fallbacks?: string[]
  /** Network status (for hackathon demo) */
  status: 'active' | 'mock' | 'disabled'
}

/**
 * Configuration options for the Walrus CDN SDK
 */
export interface WalrusCDNConfig {
  /** Base URL of your WCDN instance (e.g., 'https://cdn.yourdomain.com') */
  baseUrl: string
  /** Optional API key for authenticated requests */
  apiKey?: string
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Custom headers to include with requests */
  headers?: Record<string, string>
  /** Whether to use HTTPS (default: true) */
  secure?: boolean
  /** Custom chain endpoint configurations */
  chainEndpoints?: Partial<Record<SupportedChain, ChainEndpointConfig>>
}

/**
 * Options for multi-chain CDN URL generation
 */
export interface GetWalrusCDNUrlOptions {
  /** Target blockchain network. Defaults to 'sui' */
  chain?: SupportedChain
  /** Custom aggregator endpoint (overrides default chain endpoint) */
  customEndpoint?: string
  /** Enable fallback to multiple endpoints */
  enableFallback?: boolean
  /** Query parameters to append to CDN URL */
  params?: Record<string, string>
}

/**
 * Cache statistics for a specific CID
 */
export interface CIDStats {
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

/**
 * Cache information for a CID
 */
export interface CIDInfo {
  cid: string
  stats: CIDStats | null
  cached: boolean
  pinned: boolean
  cacheDate?: string
  ttl?: number
}

/**
 * Upload response from Walrus CDN
 */
export interface UploadResponse {
  success: boolean
  file: {
    id: string
    name: string
    size: number
    type: string
    blobId: string
    cdnUrl: string
  }
  cached: boolean
}

/**
 * Preload operation result
 */
export interface PreloadResult {
  cached: number
  errors: number
  total: number
  results: Array<{
    cid: string
    success: boolean
    error?: string
  }>
}

/**
 * Global CDN metrics
 */
export interface GlobalMetrics {
  global: {
    totalRequests: number
    totalHits: number
    totalMisses: number
    globalHitRate: number
    avgLatency: number
    uniqueCIDs: number
  }
  cache: {
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
  topCIDs: CIDStats[]
}

/**
 * Error types that can be thrown by the SDK
 */
export class WalrusCDNError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any,
  ) {
    super(message)
    this.name = 'WalrusCDNError'
  }
}

/**
 * Options for URL generation
 */
export interface UrlOptions {
  /** Whether to use the download endpoint instead of CDN */
  useDownload?: boolean
  /** Query parameters to append to the URL */
  params?: Record<string, string>
}

/**
 * Blob availability status on a specific chain
 */
export interface BlobStatus {
  /** Whether blob exists on this chain */
  exists: boolean
  /** Blockchain network this status refers to */
  chain: SupportedChain
  /** Aggregator endpoint used for verification */
  endpoint: string
  /** Last check timestamp */
  lastChecked: Date
  /** Response time in milliseconds */
  latency?: number
  /** Additional chain-specific metadata */
  metadata?: Record<string, any>
}

/**
 * Multi-chain blob status response
 */
export interface MultichainBlobStatus {
  /** Blob ID being queried */
  blobId: string
  /** Status per supported chain */
  chains: Record<SupportedChain, BlobStatus>
  /** Overall availability summary */
  summary: {
    availableChains: SupportedChain[]
    totalChains: number
    bestChain?: SupportedChain // Fastest responding chain
  }
}

/**
 * Asset verification options for multi-chain authorization
 */
export interface AssetVerificationOptions {
  /** User's wallet address */
  userAddress: string
  /** Asset ID (NFT tokenId, Sui objectId, etc.) */
  assetId: string
  /** Contract address (for Ethereum/Solana) or package ID (for Sui) */
  contractAddress?: string
  /** Additional verification parameters */
  metadata?: Record<string, any>
}

/**
 * Asset verification result
 */
export interface AssetVerificationResult {
  /** Whether user has access to the asset */
  hasAccess: boolean
  /** Chain where verification was performed */
  chain: SupportedChain
  /** Asset metadata retrieved during verification */
  assetMetadata?: {
    name?: string
    description?: string
    image?: string
    attributes?: Array<{ trait_type: string; value: any }>
    [key: string]: any
  }
  /** Verification timestamp */
  verifiedAt: Date
  /** Error message if verification failed */
  error?: string
}

/**
 * Chain node configuration for optimization
 */
export interface ChainNodeConfig {
  /** Node endpoint URL */
  url: string
  /** Network type (mainnet, testnet, devnet) */
  network: 'mainnet' | 'testnet' | 'devnet'
  /** Node priority (lower = higher priority) */
  priority: number
  /** Last measured latency in ms */
  latency?: number
  /** Whether node is currently available */
  isAvailable: boolean
  /** Node capabilities */
  capabilities?: string[]
}

/**
 * Advanced multi-chain CDN URL options with asset verification
 */
export interface AdvancedUrlOptions extends GetWalrusCDNUrlOptions {
  /** Asset verification options (optional) */
  verification?: AssetVerificationOptions
  /** Whether to skip verification and return URL directly */
  skipVerification?: boolean
  /** Custom node selection strategy */
  nodeSelectionStrategy?: 'fastest' | 'closest' | 'cheapest' | 'random'
  /** Maximum verification timeout in ms */
  verificationTimeout?: number
}

/**
 * Node selection result
 */
export interface NodeSelectionResult {
  /** Selected node configuration */
  node: ChainNodeConfig
  /** Selection strategy used */
  strategy: string
  /** Selection reason */
  reason: string
  /** Other available nodes */
  alternatives: ChainNodeConfig[]
}

/**
 * Asset query options for smart contract interaction
 */
export interface AssetQueryOptions {
  /** Target blockchain */
  chain: SupportedChain
  /** Contract address or package ID */
  contractAddress: string
  /** Asset ID to query */
  assetId: string
  /** Additional query parameters */
  params?: Record<string, any>
}

/**
 * Asset query result from smart contract
 */
export interface AssetQueryResult {
  /** Whether asset exists */
  exists: boolean
  /** Asset owner address */
  owner?: string
  /** Asset metadata */
  metadata?: {
    name?: string
    description?: string
    image?: string
    tokenURI?: string
    [key: string]: any
  }
  /** Associated blob IDs or content hashes */
  contentHashes?: string[]
  /** Query timestamp */
  queriedAt: Date
  /** Error if query failed */
  error?: string
}

/**
 * Chain verifier interface for pluggable verification strategies
 */
export interface ChainVerifier {
  /** Chain this verifier supports */
  chain: SupportedChain
  /** Verify asset ownership */
  verifyAsset(options: AssetVerificationOptions): Promise<AssetVerificationResult>
  /** Query asset information */
  queryAsset(options: AssetQueryOptions): Promise<AssetQueryResult>
  /** Check if verifier is properly configured */
  isConfigured(): boolean
}

/**
 * Multi-chain verification response
 */
export interface MultiChainVerificationResult {
  /** Primary verification result */
  primary: AssetVerificationResult
  /** Cross-chain verification results (if enabled) */
  crossChain?: Record<SupportedChain, AssetVerificationResult>
  /** Overall access decision */
  hasAccess: boolean
  /** Recommended CDN endpoint based on verification */
  recommendedEndpoint?: string
}
