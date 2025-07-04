import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface WCDNConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

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

export interface CIDInfo {
  cid: string;
  stats: CIDStats | null;
  cached: boolean;
  pinned: boolean;
  cacheDate?: string;
  ttl?: number;
}

export interface PreloadResult {
  successful: Array<{ cid: string; status: string; size?: number }>;
  failed: Array<{ error: string }>;
  total: number;
  cached: number;
  errors: number;
}

export interface GlobalStats {
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  globalHitRate: number;
  avgLatency: number;
  uniqueCIDs: number;
}

export interface CacheStats {
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
}

export interface MetricsResponse {
  global: GlobalStats;
  cache: CacheStats;
  topCIDs: CIDStats[];
}

export class WCDNClient {
  private client: AxiosInstance;
  private config: WCDNConfig;

  constructor(config: WCDNConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Get the CDN URL for a given CID
   */
  getCDNUrl(cid: string): string {
    return `${this.config.baseURL.replace('/api', '')}/cdn/${cid}`;
  }

  /**
   * Fetch content directly from CDN
   */
  async fetchContent(cid: string): Promise<ArrayBuffer> {
    const response = await axios.get(this.getCDNUrl(cid), {
      responseType: 'arraybuffer',
      timeout: this.config.timeout || 10000
    });
    return response.data;
  }

  /**
   * Get statistics for a specific CID
   */
  async getCIDStats(cid: string): Promise<CIDInfo> {
    const response: AxiosResponse<CIDInfo> = await this.client.get(`/stats/${cid}`);
    return response.data;
  }

  /**
   * Preload multiple CIDs to cache
   */
  async preloadCIDs(cids: string[]): Promise<PreloadResult> {
    const response: AxiosResponse<PreloadResult> = await this.client.post('/preload', { cids });
    return response.data;
  }

  /**
   * Pin a CID to cache (prevents eviction)
   */
  async pinCID(cid: string): Promise<{ cid: string; status: string; cached: boolean }> {
    const response = await this.client.post(`/pin/${cid}`);
    return response.data;
  }

  /**
   * Unpin a CID from cache
   */
  async unpinCID(cid: string): Promise<{ cid: string; status: string }> {
    const response = await this.client.delete(`/pin/${cid}`);
    return response.data;
  }

  /**
   * Get global metrics and statistics
   */
  async getMetrics(): Promise<MetricsResponse> {
    const response: AxiosResponse<MetricsResponse> = await this.client.get('/metrics');
    return response.data;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const response: AxiosResponse<CacheStats> = await this.client.get('/cache/stats');
    return response.data;
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<{ status: string }> {
    const response = await this.client.post('/cache/clear');
    return response.data;
  }

  /**
   * Check CDN health
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    cache: { status: string; using: string };
    version: string;
  }> {
    const response = await axios.get(`${this.config.baseURL.replace('/api', '')}/health`, {
      timeout: 5000
    });
    return response.data;
  }
}

/**
 * Create a new WCDN client instance
 */
export function createWCDNClient(config: WCDNConfig): WCDNClient {
  return new WCDNClient(config);
}

/**
 * Convenience function to get CDN URL without creating a client
 */
export function getCDNUrl(cid: string, baseURL: string = 'http://localhost:3000'): string {
  return `${baseURL}/cdn/${cid}`;
}

/**
 * Validate CID format
 */
export function validateCID(cid: string): boolean {
  return /^[a-zA-Z0-9-_]{20,}$/.test(cid);
}

/**
 * Utility functions for formatting
 */
export const utils = {
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  },

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  },

  formatLatency(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  },

  truncateCID(cid: string, length: number = 8): string {
    if (cid.length <= length * 2) return cid;
    return `${cid.slice(0, length)}...${cid.slice(-length)}`;
  }
};

// Default export
export default WCDNClient;