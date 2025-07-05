import type {
  WalrusCDNConfig,
  CIDInfo,
  UploadResponse,
  PreloadResult,
  GlobalMetrics,
  UrlOptions
} from './types.js';
import { WalrusCDNError } from './types.js';

/**
 * Walrus CDN Client - Core functionality for interacting with WCDN
 */
export class WalrusCDNClient {
  private config: Required<WalrusCDNConfig>;

  constructor(config: WalrusCDNConfig) {
    // Validate required config
    if (!config.baseUrl) {
      throw new WalrusCDNError('baseUrl is required in WalrusCDNConfig');
    }

    // Set defaults and normalize baseUrl
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      secure: config.secure !== false, // Default to true
      chainEndpoints: config.chainEndpoints || {}
    };

    // Ensure HTTPS if secure is true
    if (this.config.secure && this.config.baseUrl.startsWith('http://')) {
      this.config.baseUrl = this.config.baseUrl.replace('http://', 'https://');
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
      throw new WalrusCDNError('blobId is required');
    }

    const endpoint = options.useDownload ? '/upload/files' : '/cdn';
    let url = `${this.config.baseUrl}${endpoint}/${blobId}`;

    // Add query parameters
    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Get information about a specific CID including cache status and stats
   * @param blobId - The Walrus blob ID
   * @returns Promise with CID information
   */
  async getCIDInfo(blobId: string): Promise<CIDInfo> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required');
    }

    try {
      const response = await this.makeRequest(`/api/stats/${blobId}`);
      return response;
    } catch (error) {
      throw this.handleError(error, `Failed to get CID info for ${blobId}`);
    }
  }

  /**
   * Upload a file to Walrus via the CDN
   * @param file - File to upload (File or Blob)
   * @param vaultId - Optional vault ID for organization
   * @returns Promise with upload response
   */
  async uploadFile(file: File | Blob, vaultId?: string): Promise<UploadResponse> {
    if (!file) {
      throw new WalrusCDNError('file is required');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      let url = '/upload/file';
      if (vaultId) {
        url += `?vaultId=${encodeURIComponent(vaultId)}`;
      }

      const response = await this.makeRequest(url, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });

      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to upload file');
    }
  }

  /**
   * Preload multiple CIDs into the cache
   * @param cids - Array of blob IDs to preload
   * @returns Promise with preload results
   */
  async preloadCIDs(cids: string[]): Promise<PreloadResult> {
    if (!Array.isArray(cids) || cids.length === 0) {
      throw new WalrusCDNError('cids must be a non-empty array');
    }

    try {
      const response = await this.makeRequest('/api/preload', {
        method: 'POST',
        body: JSON.stringify({ cids }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to preload CIDs');
    }
  }

  /**
   * Pin a CID to prevent it from being evicted from cache
   * @param blobId - The blob ID to pin
   * @returns Promise that resolves when pinned
   */
  async pinCID(blobId: string): Promise<void> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required');
    }

    try {
      await this.makeRequest(`/api/pin/${blobId}`, {
        method: 'POST'
      });
    } catch (error) {
      throw this.handleError(error, `Failed to pin CID ${blobId}`);
    }
  }

  /**
   * Unpin a CID to allow it to be evicted from cache
   * @param blobId - The blob ID to unpin
   * @returns Promise that resolves when unpinned
   */
  async unpinCID(blobId: string): Promise<void> {
    if (!blobId) {
      throw new WalrusCDNError('blobId is required');
    }

    try {
      await this.makeRequest(`/api/pin/${blobId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw this.handleError(error, `Failed to unpin CID ${blobId}`);
    }
  }

  /**
   * Get global CDN metrics and performance statistics
   * @returns Promise with global metrics
   */
  async getMetrics(): Promise<GlobalMetrics> {
    try {
      const response = await this.makeRequest('/api/metrics');
      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to get metrics');
    }
  }

  /**
   * Clear the entire cache
   * @returns Promise that resolves when cache is cleared
   */
  async clearCache(): Promise<void> {
    try {
      await this.makeRequest('/api/cache/clear', {
        method: 'POST'
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to clear cache');
    }
  }

  /**
   * Check if the CDN service is healthy and accessible
   * @returns Promise that resolves to true if healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/api/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make an HTTP request to the CDN API
   * @private
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      ...this.config.headers
    };

    // Add API key if available
    if (this.config.apiKey) {
      defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new WalrusCDNError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status,
          errorData
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WalrusCDNError(
          `Request timeout after ${this.config.timeout}ms`,
          'TIMEOUT_ERROR'
        );
      }

      // Re-throw WalrusCDNError as-is
      if (error instanceof WalrusCDNError) {
        throw error;
      }

      // Handle network errors
      throw new WalrusCDNError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Handle and normalize errors
   * @private
   */
  private handleError(error: any, defaultMessage: string): WalrusCDNError {
    if (error instanceof WalrusCDNError) {
      return error;
    }

    return new WalrusCDNError(
      error?.message || defaultMessage,
      error?.code || 'UNKNOWN_ERROR',
      error?.status,
      error
    );
  }
}