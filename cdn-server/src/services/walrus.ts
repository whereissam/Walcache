import axios from 'axios'
import { config } from '../config/index.js'
import { WalrusError, WALRUS_ERROR_CODES } from '../types/walrus.js'
import type { WalrusBlob } from '../types/walrus.js'
import type { IEndpointHealthService } from './endpoint-health.js'

export interface IWalrusService {
  initialize(endpointHealthService: IEndpointHealthService): Promise<void>
  fetchBlob(cid: string): Promise<WalrusBlob | null>
  fetchBlobWithRetry(
    cid: string,
    maxRetries?: number,
    interval?: number,
  ): Promise<WalrusBlob | null>
  uploadBlob(
    data: Buffer,
    contentType: string,
    epochs?: number,
  ): Promise<string>
  healthCheck(): Promise<boolean>
  waitForAggregatorSync(
    blobId: string,
    maxRetries?: number,
    delayMs?: number,
  ): Promise<boolean>
  uploadAndWaitForSync(
    data: Buffer,
    contentType: string,
    epochs?: number,
  ): Promise<{ blobId: string; synced: boolean }>
  validateCID(cid: string): boolean
}

export class WalrusService implements IWalrusService {
  private primaryPublisher: string
  private primaryAggregator: string
  private ipfsGateway: string
  private enableIpfsFallback: boolean

  private endpointHealthService?: IEndpointHealthService

  constructor() {
    this.primaryPublisher = config.WALRUS_ENDPOINT
    this.primaryAggregator = config.WALRUS_AGGREGATOR
    this.ipfsGateway = config.IPFS_GATEWAY
    this.enableIpfsFallback = config.ENABLE_IPFS_FALLBACK
  }

  async initialize(
    endpointHealthService: IEndpointHealthService,
  ): Promise<void> {
    this.endpointHealthService = endpointHealthService
  }

  private getBestAggregator(): string {
    // Try to get the best healthy aggregator, fallback to primary
    return (
      this.endpointHealthService?.getBestAggregator() || this.primaryAggregator
    )
  }

  private getBestPublisher(): string {
    // Try to get the best healthy publisher, fallback to primary
    return (
      this.endpointHealthService?.getBestPublisher() || this.primaryPublisher
    )
  }

  private getAllHealthyAggregators(): string[] {
    const healthy = this.endpointHealthService?.getHealthyAggregators() || []
    // Always include primary as fallback
    if (!healthy.includes(this.primaryAggregator)) {
      healthy.push(this.primaryAggregator)
    }
    return healthy
  }

  async fetchBlob(cid: string): Promise<WalrusBlob | null> {
    const healthyAggregators = this.getAllHealthyAggregators()

    // Try each healthy aggregator in order
    for (const aggregatorUrl of healthyAggregators) {
      try {
        console.log(`🔍 Trying aggregator: ${aggregatorUrl}`)

        const response = await axios.get(`${aggregatorUrl}/v1/blobs/${cid}`, {
          timeout: 10000,
          responseType: 'arraybuffer',
        })

        const contentType =
          response.headers['content-type'] || 'application/octet-stream'
        const size = response.headers['content-length']
          ? parseInt(response.headers['content-length'])
          : response.data.length

        console.log(`✅ Found blob ${cid} on ${aggregatorUrl}`)

        return {
          cid,
          data: response.data,
          contentType,
          size,
          timestamp: new Date(),
          source: 'walrus',
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            console.warn(
              `Blob ${cid} not found on ${aggregatorUrl} - trying next aggregator`,
            )
            continue // Try next aggregator
          }

          console.warn(`Aggregator ${aggregatorUrl} failed: ${error.message}`)
          continue // Try next aggregator
        }

        console.error(`Unknown error with ${aggregatorUrl}:`, error)
        continue // Try next aggregator
      }
    }

    // All aggregators failed, try IPFS fallback
    console.warn(`All aggregators failed for ${cid}, trying IPFS fallback`)
    const ipfsResult = await this.tryIpfsFallback(cid)
    if (ipfsResult) {
      return ipfsResult
    }

    // Everything failed
    throw new WalrusError(
      `Blob ${cid} 在所有 aggregator 上都尚未同步，請稍後再試`,
      404,
      WALRUS_ERROR_CODES.BLOB_NOT_AVAILABLE_YET,
    )
  }

  async fetchBlobWithRetry(
    cid: string,
    maxRetries: number = 3,
    interval: number = 2000,
  ): Promise<WalrusBlob | null> {
    console.log(
      `Fetching blob ${cid} with retry (max ${maxRetries} attempts)...`,
    )

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const blob = await this.fetchBlob(cid)
        if (blob) {
          console.log(`Successfully fetched blob ${cid} on attempt ${attempt}`)
          return blob
        }
      } catch (error) {
        if (
          error instanceof WalrusError &&
          error.code === WALRUS_ERROR_CODES.BLOB_NOT_AVAILABLE_YET
        ) {
          console.log(
            `Attempt ${attempt}/${maxRetries}: Blob ${cid} not yet synced to aggregator`,
          )

          if (attempt < maxRetries) {
            console.log(`Waiting ${interval}ms before retry...`)
            await new Promise((resolve) => setTimeout(resolve, interval))
            continue
          }

          // Final attempt failed - throw the error
          throw new WalrusError(
            `Blob ${cid} 經過 ${maxRetries} 次重試後仍未同步到 aggregator，請稍後再試`,
            404,
            WALRUS_ERROR_CODES.BLOB_NOT_AVAILABLE_YET,
          )
        }

        // Other errors - don't retry
        throw error
      }
    }

    return null
  }

  private async tryIpfsFallback(cid: string): Promise<WalrusBlob | null> {
    if (!this.enableIpfsFallback) {
      return null
    }

    try {
      const response = await axios.get(`${this.ipfsGateway}${cid}`, {
        timeout: 15000,
        responseType: 'arraybuffer',
      })

      const contentType =
        response.headers['content-type'] || 'application/octet-stream'
      const size = response.headers['content-length']
        ? parseInt(response.headers['content-length'])
        : response.data.length

      return {
        cid,
        data: response.data,
        contentType,
        size,
        timestamp: new Date(),
        source: 'ipfs',
      }
    } catch (error) {
      console.warn(`IPFS fallback failed for ${cid}:`, error)
      return null
    }
  }

  async uploadBlob(
    data: Buffer,
    contentType: string,
    epochs?: number,
  ): Promise<string> {
    try {
      const publisherUrl = this.getBestPublisher()
      const url = epochs
        ? `${publisherUrl}/v1/blobs?epochs=${epochs}`
        : `${publisherUrl}/v1/blobs`

      const response = await axios.put(url, data, {
        headers: {
          'Content-Type': contentType,
        },
        timeout: 30000,
      })

      const blobId =
        response.data.newlyCreated?.blobObject?.blobId ||
        response.data.alreadyCertified?.blobId

      if (!blobId) {
        throw new WalrusError('No blob ID returned from Walrus publisher', 500)
      }

      return blobId
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new WalrusError(
          `Failed to upload blob to Walrus publisher: ${error.message}`,
          error.response?.status || 500,
        )
      }
      throw new WalrusError(`Unknown error uploading blob: ${error}`, 500)
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const aggregatorUrl = this.getBestAggregator()
      const response = await axios.get(`${aggregatorUrl}/v1/health`, {
        timeout: 5000,
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  async waitForAggregatorSync(
    blobId: string,
    maxRetries: number = 10,
    delayMs: number = 2000,
  ): Promise<boolean> {
    console.log(`Waiting for aggregator to sync blob ${blobId}...`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const aggregatorUrl = this.getBestAggregator()
        const response = await axios.head(
          `${aggregatorUrl}/v1/blobs/${blobId}`,
          {
            timeout: 5000,
          },
        )

        if (response.status === 200) {
          console.log(
            `Blob ${blobId} synced to aggregator after ${attempt} attempts`,
          )
          return true
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(
            `Attempt ${attempt}/${maxRetries}: Blob ${blobId} not yet synced`,
          )

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs))
            continue
          }
        } else {
          console.warn(`Error checking sync status for ${blobId}:`, error)
          break
        }
      }
    }

    console.warn(
      `Blob ${blobId} not synced to aggregator after ${maxRetries} attempts`,
    )
    return false
  }

  async uploadAndWaitForSync(
    data: Buffer,
    contentType: string,
    epochs?: number,
  ): Promise<{ blobId: string; synced: boolean }> {
    const blobId = await this.uploadBlob(data, contentType, epochs)
    const synced = await this.waitForAggregatorSync(blobId)

    return { blobId, synced }
  }

  validateCID(cid: string): boolean {
    // Walrus blob IDs are base64-like strings, typically 43 characters
    // Allow letters, numbers, hyphens, underscores, and optionally padding
    return /^[a-zA-Z0-9-_]{20,}={0,2}$/.test(cid)
  }
}

export const walrusService = new WalrusService()
