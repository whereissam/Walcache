import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { tuskyService } from '../services/tusky.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import type { WalrusUploadResponse } from '../types/walrus.js'
import {
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js'
import { config } from '../config/index.js'
import { WALRUS_ENDPOINTS } from '../config/walrus-endpoints.js'

const uploadFileSchema = z.object({
  vaultId: z.string().optional(),
  parentId: z.string().optional(),
})

const createVaultSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

interface UploadQueryParams {
  vaultId?: string
  parentId?: string
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit (Walrus default)
    },
  })

  // Direct upload to Walrus (official API)
  fastify.post(
    '/walrus',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file()

        if (!data) {
          return reply.status(400).send({ error: 'No file provided' })
        }

        const buffer = await data.toBuffer()
        const fileName = data.filename || 'unnamed-file'
        const contentType = data.mimetype || 'application/octet-stream'

        // Use Walrus publisher directly (following official docs)
        const network = config.WALRUS_NETWORK as 'testnet' | 'mainnet'
        const publishers = WALRUS_ENDPOINTS[network].publishers

        let lastError: Error | null = null

        // Try each publisher until one works
        for (const publisherUrl of publishers) {
          try {
            fastify.log.info(`Trying to upload to ${publisherUrl}...`)

            // Upload using Walrus official API
            const response = await fetch(`${publisherUrl}/v1/blobs?epochs=1`, {
              method: 'PUT',
              body: buffer,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
            })

            if (response.ok) {
              const walrusResponse =
                (await response.json()) as WalrusUploadResponse
              fastify.log.info('Walrus upload successful:', walrusResponse)

              // Extract blobId from response
              let blobId: string
              let suiRef: string
              let status: string

              if ('newlyCreated' in walrusResponse) {
                blobId = walrusResponse.newlyCreated.blobObject.blobId
                suiRef = walrusResponse.newlyCreated.blobObject.id
                status = 'newly_created'
              } else if ('alreadyCertified' in walrusResponse) {
                blobId = walrusResponse.alreadyCertified.blobId
                suiRef = walrusResponse.alreadyCertified.event.txDigest
                status = 'already_certified'
              } else {
                throw new Error('Unexpected Walrus response format')
              }

              // Cache the uploaded blob
              const cachedBlob = {
                cid: blobId,
                data: buffer,
                contentType,
                size: buffer.length,
                timestamp: new Date(),
                cached: new Date(),
                ttl: 3600,
                pinned: false,
              }

              await cacheService.set(blobId, cachedBlob)

              // Record analytics
              analyticsService.recordFetch(blobId, false, 0, buffer.length)

              return reply.send({
                success: true,
                blobId,
                suiRef,
                status,
                size: buffer.length,
                fileName,
                contentType,
                cdnUrl: `http://localhost:4500/cdn/${blobId}`,
                directUrl: `${config.WALRUS_AGGREGATOR}/v1/blobs/${blobId}`,
                cached: true,
                publisherUsed: publisherUrl,
              })
            } else {
              const errorText = await response.text()
              throw new Error(
                `Publisher responded with ${response.status}: ${errorText}`,
              )
            }
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error))
            fastify.log.warn(
              `Publisher ${publisherUrl} failed:`,
              lastError.message,
            )
            continue
          }
        }

        // If all publishers failed
        throw lastError || new Error('All publishers failed')
      } catch (error) {
        fastify.log.error('Direct Walrus upload error:', error)
        return reply.status(500).send({
          error: 'Upload failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Upload file to Tusky/Walrus
  fastify.post<{ Querystring: UploadQueryParams }>(
    '/file',
    { preHandler: requireAuth },
    async (
      request: AuthenticatedRequest<{ Querystring: UploadQueryParams }>,
      reply: FastifyReply,
    ) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
          message: 'TUSKY_API_KEY is required',
        })
      }

      try {
        const data = await request.file()

        if (!data) {
          return reply.status(400).send({ error: 'No file provided' })
        }

        const buffer = await data.toBuffer()
        const fileName = data.filename || 'unnamed-file'
        const contentType = data.mimetype || 'application/octet-stream'

        fastify.log.info(`Uploading file: ${fileName} (${buffer.length} bytes)`)

        // Upload to Tusky/Walrus
        const tuskyFile = await tuskyService.uploadFile(
          buffer,
          fileName,
          contentType,
          request.query.vaultId,
        )

        // Auto-cache the uploaded file
        const cachedBlob = {
          cid: tuskyFile.blobId,
          data: buffer,
          contentType: tuskyFile.type || contentType,
          size: tuskyFile.size,
          timestamp: new Date(tuskyFile.createdAt),
          cached: new Date(),
          ttl: 3600,
          pinned: false,
        }

        await cacheService.set(tuskyFile.blobId, cachedBlob)

        // Record analytics
        analyticsService.recordFetch(tuskyFile.blobId, false, 0, tuskyFile.size)

        return reply.send({
          success: true,
          file: {
            ...tuskyFile,
            cdnUrl: `http://localhost:4500/cdn/${tuskyFile.blobId}`,
            downloadUrl: `http://localhost:4500/upload/files/${tuskyFile.id}/download`,
          },
          cached: true,
        })
      } catch (error) {
        fastify.log.error('Upload error:', error)
        return reply.status(500).send({
          error: 'Upload failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Get vaults
  fastify.get(
    '/vaults',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
        })
      }

      try {
        const vaults = await tuskyService.getVaults()

        // Add cache control headers to ensure fresh data
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate')
        reply.header('Pragma', 'no-cache')
        reply.header('Expires', '0')

        return reply.send({ vaults })
      } catch (error) {
        fastify.log.error('Get vaults error:', error)
        return reply.status(500).send({
          error: 'Failed to get vaults',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Create vault
  fastify.post(
    '/vaults',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
        })
      }

      try {
        const { name, description } = createVaultSchema.parse(request.body)
        const vault = await tuskyService.createVault(name, description)
        return reply.send({ vault })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request',
            details: error.errors,
          })
        }

        fastify.log.error('Create vault error:', error)
        return reply.status(500).send({
          error: 'Failed to create vault',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Get files
  fastify.get<{ Querystring: UploadQueryParams }>(
    '/files',
    async (
      request: FastifyRequest<{ Querystring: UploadQueryParams }>,
      reply: FastifyReply,
    ) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
        })
      }

      try {
        const files = await tuskyService.getFiles(
          request.query.vaultId,
          request.query.parentId,
        )

        // Filter out deleted files and add CDN URLs
        const activeFiles = files
          .filter((file) => file.status === 'active')
          .map((file) => ({
            ...file,
            cdnUrl: `http://localhost:4500/cdn/${file.blobId}`,
            downloadUrl: `http://localhost:4500/upload/files/${file.id}/download`,
          }))

        return reply.send({ files: activeFiles })
      } catch (error) {
        fastify.log.error('Get files error:', error)
        return reply.status(500).send({
          error: 'Failed to get files',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Delete file
  fastify.delete<{ Params: { fileId: string } }>(
    '/files/:fileId',
    { preHandler: requireAuth },
    async (
      request: AuthenticatedRequest<{ Params: { fileId: string } }>,
      reply: FastifyReply,
    ) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
        })
      }

      try {
        const { fileId } = request.params

        // Get file info before deletion
        const file = await tuskyService.getFile(fileId)

        // Delete from Tusky
        await tuskyService.deleteFile(fileId)

        // Remove from cache
        await cacheService.delete(file.blobId)

        return reply.send({
          success: true,
          message: 'File deleted successfully',
        })
      } catch (error) {
        fastify.log.error('Delete file error:', error)
        return reply.status(500).send({
          error: 'Failed to delete file',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Serve file directly (fallback when CDN is unavailable)
  fastify.get<{ Params: { fileId: string } }>(
    '/files/:fileId/download',
    async (
      request: FastifyRequest<{ Params: { fileId: string } }>,
      reply: FastifyReply,
    ) => {
      if (!tuskyService.isConfigured()) {
        return reply.status(503).send({
          error: 'Tusky service not configured',
        })
      }

      try {
        const { fileId } = request.params

        // Get file info
        const file = await tuskyService.getFile(fileId)

        // Try to fetch from Tusky API directly first
        try {
          const data = await tuskyService.downloadFile(fileId)

          if (data) {
            reply.header(
              'Content-Type',
              file.type || 'application/octet-stream',
            )
            reply.header('Content-Length', data.length.toString())
            reply.header(
              'Content-Disposition',
              `inline; filename="${file.name}"`,
            )
            reply.header('X-Source', 'tusky-api')

            return reply.send(data)
          }
        } catch (tuskyError) {
          fastify.log.warn('Tusky API file fetch failed:', tuskyError)
        }

        // Fallback: Try to fetch from Walrus aggregator directly
        const network = config.WALRUS_NETWORK as 'testnet' | 'mainnet'
        const aggregators = WALRUS_ENDPOINTS[network].aggregators

        for (const aggregatorUrl of aggregators) {
          try {
            const response = await fetch(
              `${aggregatorUrl}/v1/blobs/${file.blobId}`,
            )
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const data = Buffer.from(arrayBuffer)

              reply.header(
                'Content-Type',
                file.type || 'application/octet-stream',
              )
              reply.header('Content-Length', data.length.toString())
              reply.header(
                'Content-Disposition',
                `inline; filename="${file.name}"`,
              )
              reply.header('X-Source', `walrus-${aggregatorUrl}`)

              return reply.send(data)
            }
          } catch (walrusError) {
            fastify.log.warn(
              `Walrus aggregator ${aggregatorUrl} failed:`,
              walrusError,
            )
          }
        }

        // If Walrus fails, return file metadata with error
        return reply.status(404).send({
          error: 'File content not available',
          file: {
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            blobId: file.blobId,
          },
          message:
            'File is stored on Walrus network but currently not accessible',
        })
      } catch (error) {
        fastify.log.error('File download error:', error)
        return reply.status(500).send({
          error: 'Failed to download file',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  )

  // Get Tusky health/config
  fastify.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const health = tuskyService.healthCheck()
      return reply.send(health)
    },
  )
}
