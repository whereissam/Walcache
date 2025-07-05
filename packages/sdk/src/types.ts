/**
 * Supported blockchain networks for multi-chain Walrus CDN
 */
export type SupportedChain = 'sui' | 'ethereum' | 'solana';

/**
 * Chain endpoint configuration
 */
export interface ChainEndpointConfig {
  /** Primary aggregator endpoint */
  primary: string;
  /** Fallback aggregator endpoints */
  fallbacks?: string[];
  /** Network status (for hackathon demo) */
  status: 'active' | 'mock' | 'disabled';
}

/**
 * Configuration options for the Walrus CDN SDK
 */
export interface WalrusCDNConfig {
  /** Base URL of your WCDN instance (e.g., 'https://cdn.yourdomain.com') */
  baseUrl: string;
  /** Optional API key for authenticated requests */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
  /** Whether to use HTTPS (default: true) */
  secure?: boolean;
  /** Custom chain endpoint configurations */
  chainEndpoints?: Partial<Record<SupportedChain, ChainEndpointConfig>>;
}

/**
 * Options for multi-chain CDN URL generation
 */
export interface GetWalrusCDNUrlOptions {
  /** Target blockchain network. Defaults to 'sui' */
  chain?: SupportedChain;
  /** Custom aggregator endpoint (overrides default chain endpoint) */
  customEndpoint?: string;
  /** Enable fallback to multiple endpoints */
  enableFallback?: boolean;
}

/**
 * Cache statistics for a specific CID
 */
export interface CIDStats {
  cid: string;
  requests: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgLatency: number;
  firstAccess: string;
  lastAccess: string;
  totalSize: number;
}

/**
 * Cache information for a CID
 */
export interface CIDInfo {
  cid: string;
  stats: CIDStats | null;
  cached: boolean;
  pinned: boolean;
  cacheDate?: string;
  ttl?: number;
}

/**
 * Upload response from Walrus CDN
 */
export interface UploadResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    blobId: string;
    cdnUrl: string;
  };
  cached: boolean;
}

/**
 * Preload operation result
 */
export interface PreloadResult {
  cached: number;
  errors: number;
  total: number;
  results: Array<{
    cid: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Global CDN metrics
 */
export interface GlobalMetrics {
  global: {
    totalRequests: number;
    totalHits: number;
    totalMisses: number;
    globalHitRate: number;
    avgLatency: number;
    uniqueCIDs: number;
  };
  cache: {
    memory: {
      keys: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    redis: {
      keys: number;
      memory: number;
    };
    using: 'redis' | 'memory';
  };
  topCIDs: CIDStats[];
}

/**
 * Error types that can be thrown by the SDK
 */
export class WalrusCDNError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'WalrusCDNError';
  }
}

/**
 * Options for URL generation
 */
export interface UrlOptions {
  /** Whether to use the download endpoint instead of CDN */
  useDownload?: boolean;
  /** Query parameters to append to the URL */
  params?: Record<string, string>;
}

/**
 * Blob availability status on a specific chain
 */
export interface BlobStatus {
  /** Whether blob exists on this chain */
  exists: boolean;
  /** Blockchain network this status refers to */
  chain: SupportedChain;
  /** Aggregator endpoint used for verification */
  endpoint: string;
  /** Last check timestamp */
  lastChecked: Date;
  /** Response time in milliseconds */
  latency?: number;
  /** Additional chain-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Multi-chain blob status response
 */
export interface MultichainBlobStatus {
  /** Blob ID being queried */
  blobId: string;
  /** Status per supported chain */
  chains: Record<SupportedChain, BlobStatus>;
  /** Overall availability summary */
  summary: {
    availableChains: SupportedChain[];
    totalChains: number;
    bestChain?: SupportedChain; // Fastest responding chain
  };
}