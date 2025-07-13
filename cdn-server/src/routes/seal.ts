import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { SealService } from '../services/seal.js'
import { config } from '../config/config-loader.js'
import { tuskyService } from '../services/tusky.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'

let sealService: SealService | null = null

// Initialize Seal service
async function initSealService() {
  if (!config.integrations.seal.enabled) {
    console.log('📋 Seal integration disabled in configuration')
    return
  }

  try {
    sealService = new SealService(config)
    await sealService.initialize()
    console.log('✅ Seal service initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Seal service:', error)
    // Continue without Seal - it's optional
  }
}

// Initialize on module load
initSealService()

export interface EncryptedUploadBody {
  packageId: string
  contentId?: string
  threshold?: number
  createNFT?: boolean
  name?: string
  description?: string
  metadata?: Record<string, any>
}

export interface EncryptedFileRequest extends FastifyRequest {
  file: any
  body: EncryptedUploadBody
}

export interface DecryptRequest extends FastifyRequest {
  body: {
    encryptedData: string
    txBytes: string
    sessionKey: any
  }
}

export async function sealRoutes(fastify: FastifyInstance) {
  // Status endpoint
  fastify.get('/seal/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!sealService) {
      return reply.code(503).send({
        success: false,
        error: 'Seal service not available',
        enabled: config.integrations.seal.enabled,
      })
    }

    return {
      success: true,
      data: sealService.getStatus(),
    }
  })

  // Encrypted file upload endpoint
  fastify.post('/seal/upload', {
    preHandler: fastify.auth([
      fastify.optionalAuth,
    ], {
      relation: 'or'
    })
  }, async (request: EncryptedFileRequest, reply: FastifyReply) => {
    if (!sealService || !sealService.isReady()) {
      return reply.code(503).send({
        success: false,
        error: 'Seal service not available or not ready',
      })
    }

    try {
      // Get uploaded file
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file provided',
        })
      }

      // Parse body fields
      const fields = data.fields as Record<string, any>
      const packageId = fields.packageId?.value
      const contentId = fields.contentId?.value || sealService.generateContentId()
      const threshold = fields.threshold?.value ? parseInt(fields.threshold.value) : config.integrations.seal.defaultThreshold
      const createNFT = fields.createNFT?.value === 'true'
      const name = fields.name?.value
      const description = fields.description?.value

      // Validate required fields
      if (!packageId) {
        return reply.code(400).send({
          success: false,
          error: 'packageId is required',
        })
      }

      if (!sealService.validatePackageId(packageId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid packageId format (must be 0x followed by 64 hex characters)',
        })
      }

      // Read file buffer
      const fileBuffer = await data.file.toBuffer()
      const filename = data.filename || 'encrypted-file'
      const mimetype = data.mimetype || 'application/octet-stream'

      console.log(`🔐 Encrypting file: ${filename} (${fileBuffer.length} bytes)`)

      // Encrypt the file using Seal
      const encryptResult = await sealService.encryptData(fileBuffer, {
        packageId,
        id: contentId,
        threshold,
        metadata: {
          filename,
          mimetype,
          name,
          description,
          createNFT,
        },
      })

      console.log(`✅ File encrypted successfully, uploading to Walrus...`)

      // Upload encrypted data to Walrus via Tusky
      const tuskyResult = await tuskyService.uploadFile({
        buffer: Buffer.from(encryptResult.encryptedObject),
        filename: `encrypted_${filename}`,
        mimetype: 'application/octet-stream', // Encrypted data is binary
      })

      if (!tuskyResult.success || !tuskyResult.data) {
        throw new Error(`Walrus upload failed: ${tuskyResult.error}`)
      }

      const blobId = tuskyResult.data.id
      const blobUrl = tuskyResult.data.url

      // Store metadata in cache for later decryption
      const metadataKey = `seal:metadata:${blobId}`
      await cacheService.set(metadataKey, {
        ...encryptResult.metadata,
        originalFilename: filename,
        originalMimetype: mimetype,
        encryptedAt: new Date().toISOString(),
        blobId,
        backupKey: encryptResult.backupKey, // Store backup key for disaster recovery
      }, 86400 * 30) // 30 days TTL

      // Cache the encrypted content for faster access
      const cdnUrl = `${request.protocol}://${request.hostname}:${config.server.port}/cdn/${blobId}`
      await cacheService.set(`cdn:${blobId}`, Buffer.from(encryptResult.encryptedObject))

      // Track analytics
      analyticsService.trackRequest(blobId, request.ip || 'unknown', 'upload', {
        encrypted: true,
        packageId,
        contentId,
        threshold,
        originalSize: encryptResult.originalSize,
        encryptedSize: encryptResult.encryptedObject.length,
      })

      console.log(`🎉 Encrypted upload completed: ${blobId}`)

      return {
        success: true,
        data: {
          id: blobId,
          contentId,
          packageId,
          threshold,
          cdnUrl,
          blobUrl,
          encrypted: true,
          metadata: {
            originalSize: encryptResult.originalSize,
            encryptedSize: encryptResult.encryptedObject.length,
            filename,
            mimetype,
            name,
            description,
          },
          // Note: We don't return the backup key for security
          // It's stored in cache for authorized access only
        },
      }

    } catch (error) {
      console.error('❌ Encrypted upload failed:', error)
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })

  // Decrypt endpoint
  fastify.post('/seal/decrypt/:blobId', {
    preHandler: fastify.auth([
      fastify.requireAuth,
    ])
  }, async (request: DecryptRequest & { params: { blobId: string } }, reply: FastifyReply) => {
    if (!sealService || !sealService.isReady()) {
      return reply.code(503).send({
        success: false,
        error: 'Seal service not available or not ready',
      })
    }

    try {
      const { blobId } = request.params
      const { txBytes, sessionKey } = request.body

      if (!txBytes || !sessionKey) {
        return reply.code(400).send({
          success: false,
          error: 'txBytes and sessionKey are required',
        })
      }

      // Get metadata from cache
      const metadataKey = `seal:metadata:${blobId}`
      const metadata = await cacheService.get(metadataKey)
      if (!metadata) {
        return reply.code(404).send({
          success: false,
          error: 'Encrypted file metadata not found or expired',
        })
      }

      // Get encrypted data from cache or Walrus
      let encryptedData = await cacheService.get(`cdn:${blobId}`)
      if (!encryptedData) {
        // Fallback: fetch from Walrus (this should be rare)
        const walrusResponse = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`)
        if (!walrusResponse.ok) {
          throw new Error(`Failed to fetch encrypted data from Walrus: ${walrusResponse.statusText}`)
        }
        encryptedData = Buffer.from(await walrusResponse.arrayBuffer())
        // Cache for future use
        await cacheService.set(`cdn:${blobId}`, encryptedData)
      }

      console.log(`🔓 Decrypting file: ${blobId}`)

      // Decrypt the data
      const decryptedData = await sealService.decryptData({
        encryptedData: new Uint8Array(encryptedData),
        txBytes: new Uint8Array(Buffer.from(txBytes, 'hex')),
        sessionKey,
      })

      // Track analytics
      analyticsService.trackRequest(blobId, request.ip || 'unknown', 'decrypt', {
        packageId: metadata.packageId,
        contentId: metadata.id,
        decryptedSize: decryptedData.length,
      })

      console.log(`✅ File decrypted successfully: ${blobId}`)

      // Return decrypted content with proper headers
      reply.header('Content-Type', metadata.originalMimetype || 'application/octet-stream')
      reply.header('Content-Length', decryptedData.length)
      reply.header('Content-Disposition', `inline; filename=\"${metadata.originalFilename}\"`)
      reply.header('X-Original-Size', metadata.originalSize)
      reply.header('X-Encrypted-With', 'Seal')

      return reply.send(decryptedData)

    } catch (error) {
      console.error('❌ Decryption failed:', error)
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed',
      })
    }
  })

  // Get encrypted file metadata
  fastify.get('/seal/metadata/:blobId', {
    preHandler: fastify.auth([
      fastify.optionalAuth,
    ], {
      relation: 'or'
    })
  }, async (request: FastifyRequest & { params: { blobId: string } }, reply: FastifyReply) => {
    try {
      const { blobId } = request.params
      const metadataKey = `seal:metadata:${blobId}`
      const metadata = await cacheService.get(metadataKey)

      if (!metadata) {
        return reply.code(404).send({
          success: false,
          error: 'Encrypted file metadata not found',
        })
      }

      // Don't expose backup key in public metadata
      const { backupKey, ...publicMetadata } = metadata

      return {
        success: true,
        data: {
          blobId,
          encrypted: true,
          ...publicMetadata,
        },
      }

    } catch (error) {
      console.error('❌ Failed to get metadata:', error)
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metadata',
      })
    }
  })

  // Generate content ID endpoint
  fastify.post('/seal/generate-id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!sealService) {
      return reply.code(503).send({
        success: false,
        error: 'Seal service not available',
      })
    }

    return {
      success: true,
      data: {
        contentId: sealService.generateContentId(),
      },
    }
  })
}

export default sealRoutes