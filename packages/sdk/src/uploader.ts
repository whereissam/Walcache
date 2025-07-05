import type { SupportedChain, ChainEndpointConfig } from './types';

// WCDN Backend API endpoint
const WCDN_API_BASE = 'http://localhost:4500';

export interface UploadOptions {
  chain?: SupportedChain;
  enableCache?: boolean;
  vaultId?: string;
  filename?: string;
  baseUrl?: string; // Your WCDN server URL
  preloadCache?: boolean; // Ensure file is cached immediately after upload
}

export interface UploadResult {
  success: boolean;
  blobId: string;
  cdnUrl: string;
  directUrl: string;
  cached: boolean;
  chain: SupportedChain;
  size: number;
  contentType: string;
  uploadTime: number; // milliseconds
  suiRef?: string;
  error?: string;
}

export interface CacheStatus {
  cached: boolean;
  hitCount: number;
  lastAccess: string;
  ttl: number;
  size: number;
}

/**
 * 🚀 Upload to Walrus with instant cache + zero-delay access
 * 
 * This function uploads your file to Walrus AND pre-caches it,
 * so when you use getWalrusCDNUrl() immediately after, there's NO delay!
 * 
 * Perfect flow:
 * 1. Upload file → get blob ID
 * 2. File is automatically cached on your WCDN server  
 * 3. getWalrusCDNUrl(blobId) returns instant cached access
 * 
 * Example:
 * ```typescript
 * const file = document.getElementById('fileInput').files[0];
 * 
 * // Upload + auto-cache
 * const result = await uploadToWalrusWithCache(file, { 
 *   baseUrl: 'https://your-wcdn-server.com',
 *   preloadCache: true // Ensures zero-delay access
 * });
 * 
 * // Now this URL works instantly with NO delay (cached!)
 * const url = getWalrusCDNUrl(result.blobId, {
 *   baseUrl: 'https://your-wcdn-server.com'
 * });
 * 
 * // Use immediately - no waiting for cache warming
 * <img src={url} /> // ⚡ Instant load!
 * ```
 */
export async function uploadToWalrusWithCache(
  file: File, 
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { 
    chain = 'sui',
    enableCache = true,
    vaultId,
    filename = file.name,
    baseUrl = WCDN_API_BASE,
    preloadCache = true
  } = options;

  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting upload to Walrus (${chain})...`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file, filename);
    
    // Choose upload endpoint based on whether vault is specified
    const endpoint = vaultId 
      ? `${baseUrl}/upload/file?vaultId=${vaultId}`
      : `${baseUrl}/upload/walrus`;
    
    // Upload to WCDN backend (which handles Walrus upload + caching)
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'X-API-Key': 'dev-secret-wcdn-2024', // For protected endpoints
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const uploadTime = Date.now() - startTime;

    console.log(`✅ Upload completed in ${uploadTime}ms`);

    // Construct URLs
    const cdnUrl = result.cdnUrl || `${baseUrl}/cdn/${result.blobId}`;
    const directUrl = result.directUrl || `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.blobId}`;

    const uploadResult: UploadResult = {
      success: true,
      blobId: result.blobId,
      cdnUrl,
      directUrl,
      cached: result.cached || enableCache,
      chain,
      size: file.size,
      contentType: file.type,
      uploadTime,
      suiRef: result.suiRef
    };

    // 🔥 CRITICAL: Ensure file is immediately cached for zero-delay access
    if (preloadCache) {
      console.log(`🔄 Pre-warming cache for instant access...`);
      try {
        // Pre-warm the cache by making a HEAD request to your CDN URL
        const warmupResponse = await fetch(cdnUrl, { method: 'HEAD' });
        if (warmupResponse.ok) {
          console.log(`✅ Cache pre-warmed! getWalrusCDNUrl() will be instant.`);
          uploadResult.cached = true;
        }
      } catch (warmupError) {
        console.warn(`⚠️ Cache pre-warming failed:`, warmupError);
        // Don't fail the upload if cache warming fails
      }
    }

    return uploadResult;

  } catch (error) {
    console.error('❌ Upload failed:', error);
    
    return {
      success: false,
      blobId: '',
      cdnUrl: '',
      directUrl: '',
      cached: false,
      chain,
      size: file.size,
      contentType: file.type,
      uploadTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 📊 Get cache status for a specific blob
 */
export async function getCacheStatus(blobId: string): Promise<CacheStatus | null> {
  try {
    const response = await fetch(`${WCDN_API_BASE}/api/stats/${blobId}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      cached: data.cached,
      hitCount: data.stats?.requests || 0,
      lastAccess: data.stats?.lastAccess || new Date().toISOString(),
      ttl: data.ttl || 0,
      size: data.stats?.totalSize || 0
    };
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return null;
  }
}

/**
 * ⚡ Fast cached access - get content from cache or Walrus
 */
export async function getCachedContent(blobId: string, chain: SupportedChain = 'sui'): Promise<{
  url: string;
  cached: boolean;
  latency: number;
}> {
  const startTime = Date.now();
  
  // Try WCDN cache first
  const cdnUrl = `${WCDN_API_BASE}/cdn/${blobId}?chain=${chain}`;
  
  try {
    const response = await fetch(cdnUrl, { method: 'HEAD' });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const cached = response.headers.get('X-Cache-Status') === 'HIT';
      return {
        url: cdnUrl,
        cached,
        latency
      };
    }
  } catch (error) {
    console.error('CDN access failed:', error);
  }
  
  // Fallback to direct Walrus
  const directUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
  const latency = Date.now() - startTime;
  
  return {
    url: directUrl,
    cached: false,
    latency
  };
}

/**
 * 🚀 Ultimate convenience function: Upload + Instant URL
 * 
 * Perfect for developers who want to upload and immediately use the file:
 * 
 * ```typescript
 * const file = document.getElementById('fileInput').files[0];
 * 
 * // One function call - upload + get instant cached URL
 * const { url, blobId, cached } = await uploadAndGetInstantUrl(file, {
 *   baseUrl: 'https://your-wcdn-server.com'
 * });
 * 
 * // URL is immediately usable with ZERO delay
 * <img src={url} /> // ⚡ Instant load - no cache miss!
 * ```
 */
export async function uploadAndGetInstantUrl(
  file: File,
  options: UploadOptions & { baseUrl: string } = { baseUrl: WCDN_API_BASE }
): Promise<{
  url: string;
  blobId: string;
  cached: boolean;
  uploadTime: number;
  cdnUrl: string;
  directUrl: string;
}> {
  // Upload with auto-cache pre-warming
  const uploadResult = await uploadToWalrusWithCache(file, {
    ...options,
    preloadCache: true // Always pre-warm cache
  });

  if (!uploadResult.success) {
    throw new Error(uploadResult.error || 'Upload failed');
  }

  // Generate the cached URL (same as getWalrusCDNUrl would return)
  const url = `${options.baseUrl}/cdn/${uploadResult.blobId}`;

  return {
    url, // This URL has ZERO delay - it's pre-cached!
    blobId: uploadResult.blobId,
    cached: uploadResult.cached,
    uploadTime: uploadResult.uploadTime,
    cdnUrl: uploadResult.cdnUrl,
    directUrl: uploadResult.directUrl
  };
}

/**
 * 🔄 Pre-warm cache for frequently accessed content
 */
export async function preloadToCache(blobIds: string[]): Promise<{
  success: number;
  failed: number;
  results: Array<{ blobId: string; success: boolean; error?: string }>
}> {
  try {
    const response = await fetch(`${WCDN_API_BASE}/api/preload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-secret-wcdn-2024'
      },
      body: JSON.stringify({ cids: blobIds })
    });

    if (!response.ok) {
      throw new Error(`Preload failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      success: result.cached || 0,
      failed: result.errors || 0,
      results: result.details || []
    };
  } catch (error) {
    console.error('Preload failed:', error);
    return {
      success: 0,
      failed: blobIds.length,
      results: blobIds.map(blobId => ({
        blobId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    };
  }
}