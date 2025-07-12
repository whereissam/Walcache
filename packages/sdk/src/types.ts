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

// =============================================================================
// STRIPE-STYLE API RESOURCE TYPES (v1 API)
// =============================================================================

/**
 * Base interface for all Stripe-style resources
 */
export interface StripeResource {
  /** Unique identifier for the resource */
  id: string
  /** Type of resource */
  object: string
  /** Unix timestamp of when the resource was created */
  created: number
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  /** Number of items to return (1-100) */
  limit?: number
  /** Cursor for forward pagination */
  starting_after?: string
  /** Cursor for backward pagination */
  ending_before?: string
}

/**
 * Paginated list response
 */
export interface PaginatedList<T> {
  /** Always 'list' for paginated responses */
  object: 'list'
  /** Array of data objects */
  data: T[]
  /** Whether there are more items available */
  has_more: boolean
  /** URL of the current endpoint */
  url: string
}

/**
 * Standardized error response format
 */
export interface ApiError {
  error: {
    /** Type of error */
    type: 'validation_error' | 'authentication_error' | 'permission_error' | 'not_found_error' | 'rate_limit_error' | 'api_error' | 'network_error'
    /** Human-readable error message */
    message: string
    /** Machine-readable error code */
    code?: string
    /** Parameter that caused the error */
    param?: string
  }
}

/**
 * Blob resource representing content in the Walrus network
 */
export interface BlobResource extends StripeResource {
  object: 'blob'
  /** Content identifier (same as id) */
  cid: string
  /** Size in bytes */
  size: number
  /** MIME content type */
  content_type: string
  /** Whether blob is currently cached */
  cached: boolean
  /** Whether blob is pinned to prevent eviction */
  pinned: boolean
  /** Unix timestamp when blob was cached */
  cache_date?: number
  /** Time to live in seconds (0 for pinned) */
  ttl?: number
  /** Source of the blob data */
  source?: string
}

/**
 * Upload resource representing a file upload operation
 */
export interface UploadResource extends StripeResource {
  object: 'upload'
  /** Original filename */
  filename: string
  /** File size in bytes */
  size: number
  /** MIME content type */
  content_type: string
  /** Resulting blob ID after upload */
  blob_id: string
  /** Upload status */
  status: 'processing' | 'completed' | 'failed'
  /** Tusky vault ID (if applicable) */
  vault_id?: string
  /** Parent folder ID (if applicable) */
  parent_id?: string
}

/**
 * Cache resource representing a cached item
 */
export interface CacheResource extends StripeResource {
  object: 'cache'
  /** Associated blob ID */
  blob_id: string
  /** Size in bytes */
  size: number
  /** Whether cache entry is pinned */
  pinned: boolean
  /** Time to live in seconds */
  ttl: number
  /** Unix timestamp when entry expires */
  expires_at: number
  /** Unix timestamp of last access */
  last_accessed: number
}

/**
 * Analytics resource representing usage statistics
 */
export interface AnalyticsResource extends StripeResource {
  object: 'analytics'
  /** Associated blob ID */
  blob_id: string
  /** Total number of requests */
  total_requests: number
  /** Number of cache hits */
  cache_hits: number
  /** Number of cache misses */
  cache_misses: number
  /** Total bytes served */
  total_bytes_served: number
  /** Unix timestamp of last access */
  last_accessed: number
  /** Geographic distribution of requests */
  geographic_stats: Record<string, number>
}

// =============================================================================
// OPERATION RESULT TYPES (v1 API)
// =============================================================================

/**
 * Result of cache preload operation
 */
export interface PreloadResult {
  object: 'preload_result'
  successful: Array<{
    blob_id: string
    status: 'cached' | 'already_cached'
    size?: number
  }>
  failed: Array<{
    blob_id: string
    error: string
  }>
  total: number
  cached: number
  errors: number
}

/**
 * Result of cache clear operation
 */
export interface ClearResult {
  object: 'clear_result'
  status?: 'all_cleared'
  message?: string
  successful?: Array<{
    blob_id: string
    status: 'cleared'
  }>
  failed?: Array<{
    blob_id: string
    error: string
  }>
  total?: number
  cleared?: number
}

/**
 * Cache statistics response
 */
export interface CacheStats {
  object: 'cache_stats'
  created: number
  total_entries: number
  total_size_bytes: number
  pinned_entries: number
  memory_usage_mb: number
  redis_connected: boolean
  hit_rate: number
}

/**
 * Global analytics response
 */
export interface GlobalAnalytics {
  object: 'global_analytics'
  created: number
  global: {
    total_requests: number
    cache_hits: number
    cache_misses: number
    total_bytes_served: number
    unique_cids: number
    uptime: number
  }
  cache: {
    total_entries: number
    total_size: number
    pinned_entries: number
    memory_usage: number
    redis_connected: boolean
  }
  geographic: Record<string, number>
  top_blobs: Array<{
    cid: string
    requests: number
  }>
  system: {
    memory_usage: number
    cpu_usage: number
    uptime: number
  }
  application: {
    active_connections: number
    requests_per_second: number
    error_rate: number
  }
}

// =============================================================================
// URL GENERATION AND OPTIONS
// =============================================================================

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

// =============================================================================
// LEGACY TYPE ALIASES (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use BlobResource instead
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
 * @deprecated Use AnalyticsResource for individual blob stats
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
 * @deprecated Use UploadResource instead
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
 * @deprecated Use GlobalAnalytics instead
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
 * Enhanced error class with support for new v1 API error format
 */
export class WalrusCDNError extends Error {
  public code?: string
  public status?: number
  public details?: any
  public type?: string
  public param?: string

  constructor(
    message: string,
    code?: string,
    status?: number,
    details?: any,
  ) {
    super(message)
    this.name = 'WalrusCDNError'
    this.code = code
    this.status = status
    this.details = details
  }

  /**
   * Create error from v1 API error response
   */
  static fromApiError(apiError: ApiError, status?: number): WalrusCDNError {
    const error = new WalrusCDNError(
      apiError.error.message,
      apiError.error.code,
      status,
      apiError
    )
    error.type = apiError.error.type
    error.param = apiError.error.param
    return error
  }

  /**
   * Convert to API error format
   */
  toApiError(): ApiError {
    return {
      error: {
        type: (this.type as any) || 'api_error',
        message: this.message,
        code: this.code,
        param: this.param
      }
    }
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
  /** Geographic region for optimal routing */
  region?: 'europe' | 'north-america' | 'asia' | 'global'
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
  verifyAsset(
    options: AssetVerificationOptions,
  ): Promise<AssetVerificationResult>
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

/**
 * Upload options for Walrus uploader
 */
export interface UploadOptions {
  /** Vault ID for organization */
  vaultId?: string
  /** File encryption preference */
  encryption?: 'auto' | 'enabled' | 'disabled'
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Upload result from Walrus
 */
export interface UploadResult {
  /** Uploaded blob ID */
  blobId: string
  /** File information */
  file: {
    name: string
    size: number
    type: string
  }
  /** Upload metadata */
  metadata?: Record<string, any>
  /** CDN URL for the uploaded content */
  cdnUrl?: string
}

/**
 * Cache status information
 */
export interface CacheStatus {
  /** Whether content is cached */
  cached: boolean
  /** Cache level (memory, redis, etc.) */
  level?: 'memory' | 'redis' | 'disk'
  /** Cache timestamp */
  cachedAt?: Date
  /** Time to live in seconds */
  ttl?: number
}
