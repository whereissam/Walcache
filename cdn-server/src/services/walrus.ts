import axios from 'axios';
import { config } from '../config/index.js';
import { WalrusError } from '../types/walrus.js';
import type { WalrusBlob } from '../types/walrus.js';

class WalrusService {
  private publisherEndpoint: string;
  private aggregatorEndpoint: string;

  constructor() {
    this.publisherEndpoint = config.WALRUS_ENDPOINT;
    this.aggregatorEndpoint = config.WALRUS_AGGREGATOR;
  }

  async fetchBlob(cid: string): Promise<WalrusBlob | null> {
    try {
      const response = await axios.get(`${this.aggregatorEndpoint}/v1/${cid}`, {
        timeout: 10000,
        responseType: 'arraybuffer'
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const size = response.headers['content-length'] 
        ? parseInt(response.headers['content-length']) 
        : response.data.length;

      return {
        cid,
        data: response.data,
        contentType,
        size,
        timestamp: new Date()
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw new WalrusError(
          `Failed to fetch blob from Walrus: ${error.message}`,
          error.response?.status || 500
        );
      }
      throw new WalrusError(`Unknown error fetching blob: ${error}`, 500);
    }
  }

  async uploadBlob(data: Buffer, contentType: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.publisherEndpoint}/v1/store`,
        data,
        {
          headers: {
            'Content-Type': contentType,
          },
          timeout: 30000
        }
      );

      return response.data.newlyCreated?.blobObject?.blobId || 
             response.data.alreadyCertified?.blobId;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new WalrusError(
          `Failed to upload blob to Walrus: ${error.message}`,
          error.response?.status || 500
        );
      }
      throw new WalrusError(`Unknown error uploading blob: ${error}`, 500);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.aggregatorEndpoint}/v1/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  validateCID(cid: string): boolean {
    // Walrus blob IDs are base64-like strings, typically 43 characters
    // Allow letters, numbers, hyphens, underscores, and optionally padding
    return /^[a-zA-Z0-9-_]{20,}={0,2}$/.test(cid);
  }
}

export const walrusService = new WalrusService();