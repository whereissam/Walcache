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

export { WalrusCDNClient } from './client.js';
export * from './types.js';

// Re-export for convenience
import { WalrusCDNClient } from './client.js';
import type { WalrusCDNConfig, UrlOptions, SupportedChain, GetWalrusCDNUrlOptions, ChainEndpointConfig } from './types.js';

/**
 * Default multi-chain Walrus aggregator endpoints
 */
const WALRUS_AGGREGATOR_ENDPOINTS: Record<SupportedChain, ChainEndpointConfig> = {
  sui: {
    primary: 'https://aggregator.walrus-testnet.walrus.space',
    fallbacks: [
      'https://aggregator.testnet.walrus.atalma.io',
      'https://sui-walrus-tn-aggregator.bwarelabs.com'
    ],
    status: 'active'
  },
  ethereum: {
    primary: 'https://eth-aggregator.walrus.space', // mock endpoint for hackathon
    fallbacks: ['https://eth-backup.walrus.space'],
    status: 'mock'
  },
  solana: {
    primary: 'https://sol-aggregator.walrus.space', // mock endpoint for hackathon
    fallbacks: ['https://sol-backup.walrus.space'],
    status: 'mock'
  }
};

/**
 * Default CDN client instance for simple usage
 */
let defaultClient: WalrusCDNClient | null = null;

/**
 * Configure the default CDN client
 * @param config - Configuration for the default client
 */
export function configure(config: WalrusCDNConfig): void {
  defaultClient = new WalrusCDNClient(config);
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
  options?: UrlOptions
): string {
  // Use provided config or default client
  if (config) {
    const client = new WalrusCDNClient(config);
    return client.getCDNUrl(blobId, options);
  }
  
  if (!defaultClient) {
    throw new Error(
      'No CDN configuration found. Either pass config as second parameter or call configure() first.'
    );
  }
  
  return defaultClient.getCDNUrl(blobId, options);
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
  options?: GetWalrusCDNUrlOptions
): string {
  // Use custom endpoint if provided
  if (options?.customEndpoint) {
    return `${options.customEndpoint}/v1/blobs/${blobId}`;
  }

  // Default to 'sui' if no chain specified
  const chain = options?.chain ?? 'sui';
  
  // Get endpoint configuration for the chain
  const chainConfig = WALRUS_AGGREGATOR_ENDPOINTS[chain];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  // Use primary endpoint
  const endpoint = chainConfig.primary;
  
  // Walrus aggregator API: /v1/blobs/:blobId
  return `${endpoint}/v1/blobs/${blobId}`;
}

/**
 * Get the default client instance (must call configure() first)
 * @returns The configured default client
 */
export function getDefaultClient(): WalrusCDNClient {
  if (!defaultClient) {
    throw new Error('No default client configured. Call configure() first.');
  }
  return defaultClient;
}

/**
 * Convenience functions that use the default client
 */

/**
 * Get information about a CID using the default client
 */
export async function getCIDInfo(blobId: string) {
  return getDefaultClient().getCIDInfo(blobId);
}

/**
 * Upload a file using the default client
 */
export async function uploadFile(file: File | Blob, vaultId?: string) {
  return getDefaultClient().uploadFile(file, vaultId);
}

/**
 * Preload CIDs using the default client
 */
export async function preloadCIDs(cids: string[]) {
  return getDefaultClient().preloadCIDs(cids);
}

/**
 * Pin a CID using the default client
 */
export async function pinCID(blobId: string) {
  return getDefaultClient().pinCID(blobId);
}

/**
 * Unpin a CID using the default client
 */
export async function unpinCID(blobId: string) {
  return getDefaultClient().unpinCID(blobId);
}

/**
 * Get metrics using the default client
 */
export async function getMetrics() {
  return getDefaultClient().getMetrics();
}

/**
 * Health check using the default client
 */
export async function healthCheck() {
  return getDefaultClient().healthCheck();
}

/**
 * Get available chains and their endpoint configurations
 * @returns Object with chain configurations
 */
export function getAvailableChains(): Record<SupportedChain, ChainEndpointConfig> {
  return { ...WALRUS_AGGREGATOR_ENDPOINTS };
}

/**
 * Get endpoint for a specific chain
 * @param chain - Target blockchain network
 * @param preferFallback - Use fallback endpoint instead of primary
 * @returns Aggregator endpoint URL
 */
export function getChainEndpoint(chain: SupportedChain, preferFallback = false): string {
  const chainConfig = WALRUS_AGGREGATOR_ENDPOINTS[chain];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  if (preferFallback && chainConfig.fallbacks && chainConfig.fallbacks.length > 0) {
    return chainConfig.fallbacks[0];
  }

  return chainConfig.primary;
}

/**
 * Check if a chain is supported
 * @param chain - Chain to check
 * @returns True if chain is supported
 */
export function isSupportedChain(chain: string): chain is SupportedChain {
  return chain in WALRUS_AGGREGATOR_ENDPOINTS;
}

/**
 * Get mock blob status for hackathon demo
 * @param blobId - Blob ID to check
 * @returns Mock multi-chain status
 */
export async function getBlobStatus(blobId: string): Promise<any> {
  // Mock implementation for hackathon
  const mockStatus = {
    blobId,
    chains: {
      sui: {
        exists: true,
        chain: 'sui' as SupportedChain,
        endpoint: WALRUS_AGGREGATOR_ENDPOINTS.sui.primary,
        lastChecked: new Date(),
        latency: 150,
        metadata: { network: 'testnet', epochStored: 8 }
      },
      ethereum: {
        exists: Math.random() > 0.3, // 70% availability for demo
        chain: 'ethereum' as SupportedChain,
        endpoint: WALRUS_AGGREGATOR_ENDPOINTS.ethereum.primary,
        lastChecked: new Date(),
        latency: 300,
        metadata: { network: 'mock', status: 'experimental' }
      },
      solana: {
        exists: Math.random() > 0.5, // 50% availability for demo
        chain: 'solana' as SupportedChain,
        endpoint: WALRUS_AGGREGATOR_ENDPOINTS.solana.primary,
        lastChecked: new Date(),
        latency: 250,
        metadata: { network: 'mock', status: 'experimental' }
      }
    },
    summary: {
      availableChains: [] as SupportedChain[],
      totalChains: 3,
      bestChain: 'sui' as SupportedChain
    }
  };

  // Calculate available chains
  mockStatus.summary.availableChains = Object.entries(mockStatus.chains)
    .filter(([_, status]) => status.exists)
    .map(([chain, _]) => chain as SupportedChain);

  return mockStatus;
}

// Export uploader functions
export { 
  uploadToWalrusWithCache, 
  uploadAndGetInstantUrl,
  getCacheStatus, 
  getCachedContent, 
  preloadToCache 
} from './uploader';

// Export uploader types
export type { UploadOptions, UploadResult, CacheStatus } from './uploader';

// Version information
export const version = '1.0.0';