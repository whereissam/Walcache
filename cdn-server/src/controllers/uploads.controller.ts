import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { BaseController } from './base.controller.js'
import { tuskyService } from '../services/tusky.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import { walrusService } from '../services/walrus.js'
import type { UploadResource, PaginationParams } from '../types/api.js'
import { config } from '../config/index.js'
import { WALRUS_ENDPOINTS } from '../config/walrus-endpoints.js'
import type { WalrusUploadResponse } from '../types/walrus.js'

const createUploadSchema = z.object({
  vault_id: z.string().optional(),
  parent_id: z.string().optional(),
})

interface UploadParams {
  id: string
}

interface UploadQueryParams extends PaginationParams {
  vault_id?: string
  status?: 'processing' | 'completed' | 'failed'
}

export class UploadsController extends BaseController {
  async create(
    request: FastifyRequest<{ Querystring: UploadQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const data = await request.file()

      if (!data) {
        this.sendValidationError(reply, 'No file provided')
        return
      }

      const buffer = await data.toBuffer()
      const fileName = data.filename || 'unnamed-file'
      const contentType = data.mimetype || 'application/octet-stream'

      // Check file size limit
      if (buffer.length > 10 * 1024 * 1024) {
        this.sendValidationError(reply, 'File size exceeds 10MB limit', 'file')
        return
      }

      const uploadId = this.generateId()

      // Create initial upload record
      const upload: UploadResource = {
        id: uploadId,
        object: 'upload',
        created: this.getUnixTimestamp(),
        filename: fileName,
        size: buffer.length,
        content_type: contentType,
        blob_id: '',
        status: 'processing',
        vault_id: request.query.vault_id,
        parent_id: request.query.parent_id
      }

      // Return immediate response
      reply.send(upload)

      // Process upload asynchronously
      this.processUpload(uploadId, buffer, fileName, contentType, request.query)
    }, reply)
  }

  private async processUpload(
    uploadId: string,
    buffer: Buffer,
    fileName: string,
    contentType: string,
    options: UploadQueryParams
  ): Promise<void> {
    try {
      let blobId: string
      let suiRef: string

      if (tuskyService.isConfigured() && options.vault_id) {
        // Upload via Tusky
        const tuskyFile = await tuskyService.uploadFile(
          buffer,
          fileName,
          contentType,
          options.vault_id
        )
        blobId = tuskyFile.blobId
        suiRef = tuskyFile.id
      } else {
        // Direct Walrus upload
        const network = config.WALRUS_NETWORK as 'testnet' | 'mainnet'
        const publishers = WALRUS_ENDPOINTS[network].publishers

        let uploadSuccess = false
        let lastError: Error | null = null

        for (const publisherUrl of publishers) {
          try {
            const response = await fetch(`${publisherUrl}/v1/blobs?epochs=1`, {
              method: 'PUT',
              body: buffer,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
            })

            if (response.ok) {
              const walrusResponse = await response.json() as WalrusUploadResponse
              
              if ('newlyCreated' in walrusResponse) {
                blobId = walrusResponse.newlyCreated.blobObject.blobId
                suiRef = walrusResponse.newlyCreated.blobObject.id
              } else if ('alreadyCertified' in walrusResponse) {
                blobId = walrusResponse.alreadyCertified.blobId
                suiRef = walrusResponse.alreadyCertified.event.txDigest
              } else {
                throw new Error('Unexpected Walrus response format')
              }

              uploadSuccess = true
              break
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            continue
          }
        }

        if (!uploadSuccess) {
          throw lastError || new Error('All publishers failed')
        }
      }

      // Cache the uploaded blob
      const cachedBlob = {
        cid: blobId!,
        data: buffer,
        contentType,
        size: buffer.length,
        timestamp: new Date(),
        cached: new Date(),
        ttl: 3600,
        pinned: false,
      }

      await cacheService.set(blobId!, cachedBlob)
      analyticsService.recordFetch(blobId!, false, 0, buffer.length)

      // Update upload record status (in a real implementation, you'd store this in a database)
      console.log(`Upload ${uploadId} completed successfully with blob ID: ${blobId}`)

    } catch (error) {
      console.error(`Upload ${uploadId} failed:`, error)
      // Update upload record status to failed (in a real implementation)
    }
  }

  async retrieve(
    request: FastifyRequest<{ Params: UploadParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    await this.handleAsync(async () => {
      // In a real implementation, retrieve from database
      // For demo, return a mock upload
      const upload: UploadResource = {
        id,
        object: 'upload',
        created: this.getUnixTimestamp(),
        filename: 'example.txt',
        size: 1024,
        content_type: 'text/plain',
        blob_id: 'example_blob_id',
        status: 'completed'
      }

      reply.send(upload)
    }, reply)
  }

  async list(
    request: FastifyRequest<{ Querystring: UploadQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleAsync(async () => {
      const params = this.parsePaginationParams(request.query)
      const { vault_id, status } = request.query

      // In a real implementation, query database with filters and pagination
      // For demo, return mock data
      const uploads: UploadResource[] = [
        {
          id: 'upload_1',
          object: 'upload',
          created: this.getUnixTimestamp(),
          filename: 'document.pdf',
          size: 2048,
          content_type: 'application/pdf',
          blob_id: 'blob_123',
          status: 'completed',
          vault_id: vault_id || undefined
        }
      ]

      const response = this.createPaginatedResponse(
        uploads,
        '/v1/uploads',
        false
      )

      reply.send(response)
    }, reply)
  }

  async delete(
    request: FastifyRequest<{ Params: UploadParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params

    await this.handleAsync(async () => {
      // In a real implementation, soft delete the upload record
      // and optionally remove from cache/Tusky

      const upload: UploadResource = {
        id,
        object: 'upload',
        created: this.getUnixTimestamp(),
        filename: 'deleted-file.txt',
        size: 0,
        content_type: 'text/plain',
        blob_id: '',
        status: 'failed'
      }

      reply.send(upload)
    }, reply)
  }
}