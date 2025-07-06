import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { walrusService } from '../services/walrus.js'
import { cacheService } from '../services/cache.js'
import { analyticsService } from '../services/analytics.js'
import type { CachedBlob } from '../types/cache.js'

interface CDNParams {
  cid: string
}

/**
 * Determine if content should be displayed inline in browser
 * instead of being downloaded
 */
function shouldDisplayInline(contentType: string): boolean {
  if (!contentType) return false
  
  const inlineTypes = [
    // Images
    'image/',
    // Videos
    'video/',
    // Audio
    'audio/',
    // Text documents
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/xml',
    // PDFs
    'application/pdf',
    // JSON/XML
    'application/json',
    'application/xml',
    // Web formats
    'application/javascript',
    'application/xhtml+xml',
    'image/svg+xml',
  ]
  
  return inlineTypes.some(type => contentType.startsWith(type))
}

/**
 * Get proper file extension from content type
 */
function getFileExtension(contentType: string): string {
  const extensionMap: Record<string, string> = {
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg', 
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    // Videos
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/avi': 'avi',
    'video/mov': 'mov',
    // Audio
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    // Documents
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/javascript': 'js',
    'application/json': 'json',
    'text/xml': 'xml',
    'application/xml': 'xml',
    // Archives
    'application/zip': 'zip',
    'application/x-tar': 'tar',
    'application/gzip': 'gz',
    // Office
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  }

  return extensionMap[contentType] || 'bin'
}

/**
 * Generate proper filename for download
 */
function generateFilename(cid: string, contentType: string): string {
  const extension = getFileExtension(contentType)
  // Use first 12 characters of CID for shorter, cleaner filename
  const shortCid = cid.slice(0, 12)
  return `walrus-${shortCid}.${extension}`
}

export async function cdnRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: CDNParams }>(
    '/:cid',
    async (
      request: FastifyRequest<{ Params: CDNParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params
      const startTime = Date.now()

      // First check if it's a valid CID format
      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send({ error: 'Invalid CID format' })
      }

      try {
        // Check cache first
        const cached = await cacheService.get(cid)

        if (cached) {
          const latency = Date.now() - startTime
          const clientIP =
            request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.ip
          const userAgent = request.headers['user-agent']
          analyticsService.recordFetch(
            cid,
            true,
            latency,
            cached.size,
            clientIP as string,
            userAgent,
          )

          reply.header('Content-Type', cached.contentType)
          reply.header('Content-Length', cached.size.toString())
          reply.header('X-Cache', 'HIT')
          reply.header('X-Cache-Date', cached.cached.toISOString())
          reply.header('X-TTL', cached.ttl.toString())
          
          // Set Content-Disposition with proper filename
          const filename = generateFilename(cached.cid, cached.contentType)
          if (shouldDisplayInline(cached.contentType)) {
            reply.header('Content-Disposition', `inline; filename="${filename}"`)
          } else {
            reply.header('Content-Disposition', `attachment; filename="${filename}"`)
          }
          
          // Add cache control headers for better browser caching
          reply.header('Cache-Control', 'public, max-age=3600, immutable')
          reply.header('ETag', `"${cached.cid}"`)

          return reply.send(cached.data)
        }

        // If not in cache, try to fetch from Walrus with retry
        try {
          const blob = await walrusService.fetchBlobWithRetry(cid, 3, 2000)

          if (blob) {
            const cachedBlob: CachedBlob = {
              cid: blob.cid,
              data: blob.data,
              contentType: blob.contentType,
              size: blob.size,
              timestamp: blob.timestamp,
              cached: new Date(),
              ttl: 3600,
              pinned: false,
            }

            await cacheService.set(cid, cachedBlob)

            const latency = Date.now() - startTime
            const clientIP =
              request.headers['x-forwarded-for'] ||
              request.headers['x-real-ip'] ||
              request.ip
            const userAgent = request.headers['user-agent']
            analyticsService.recordFetch(
              cid,
              false,
              latency,
              blob.size,
              clientIP as string,
              userAgent,
            )

            reply.header('Content-Type', blob.contentType)
            reply.header('Content-Length', blob.size.toString())
            reply.header('X-Cache', 'MISS')
            reply.header('X-Fetch-Time', `${latency}ms`)
            reply.header('X-Source', blob.source)
            
            // Set Content-Disposition with proper filename
            const filename = generateFilename(blob.cid, blob.contentType)
            if (shouldDisplayInline(blob.contentType)) {
              reply.header('Content-Disposition', `inline; filename="${filename}"`)
            } else {
              reply.header('Content-Disposition', `attachment; filename="${filename}"`)
            }
            
            // Add cache control headers for better browser caching
            reply.header('Cache-Control', 'public, max-age=3600, immutable')
            reply.header('ETag', `"${blob.cid}"`)

            // Trigger webhook for successful blob download
            analyticsService.sendWebhook({
              type: 'download',
              cid: blob.cid,
              timestamp: new Date(),
              source: blob.source,
              size: blob.size,
              latency,
              clientIP: clientIP as string,
              userAgent,
            })

            return reply.send(blob.data)
          }
        } catch (walrusError) {
          fastify.log.warn(
            'Walrus fetch failed, will try direct aggregator access:',
            walrusError,
          )
        }

        // If Walrus service fails completely, return the structured error response

        return reply.status(404).send({
          error: 'BLOB_NOT_FOUND',
          code: 'BLOB_NOT_FOUND',
          message:
            'Blob not found on Walrus network or aggregators have not synced it yet.',
          suggestions: [
            'Verify the blob ID is correct',
            'Wait for aggregator synchronization (usually 1-2 minutes)',
            'Check if the blob was recently uploaded',
            'Try again in a few minutes',
          ],
          retryAfter: 120, // seconds
        })
      } catch (error) {
        const latency = Date.now() - startTime
        const clientIP =
          request.headers['x-forwarded-for'] ||
          request.headers['x-real-ip'] ||
          request.ip
        const userAgent = request.headers['user-agent']
        analyticsService.recordFetch(
          cid,
          false,
          latency,
          undefined,
          clientIP as string,
          userAgent,
        )

        fastify.log.error('CDN fetch error:', error)

        if (
          error instanceof Error &&
          'statusCode' in error &&
          'code' in error
        ) {
          const walrusError = error as any
          return reply.status(walrusError.statusCode).send({
            error: walrusError.message,
            code: walrusError.code,
            retryAfter:
              walrusError.code === 'BLOB_NOT_AVAILABLE_YET' ? 120 : undefined,
          })
        }

        return reply.status(500).send({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        })
      }
    },
  )

  fastify.head<{ Params: CDNParams }>(
    '/:cid',
    async (
      request: FastifyRequest<{ Params: CDNParams }>,
      reply: FastifyReply,
    ) => {
      const { cid } = request.params

      if (!walrusService.validateCID(cid)) {
        return reply.status(400).send()
      }

      try {
        const cached = await cacheService.get(cid)

        if (cached) {
          reply.header('Content-Type', cached.contentType)
          reply.header('Content-Length', cached.size.toString())
          reply.header('X-Cache', 'HIT')
          reply.header('X-Cache-Date', cached.cached.toISOString())
          return reply.send()
        }

        const blob = await walrusService.fetchBlob(cid)

        if (!blob) {
          return reply.status(404).send()
        }

        reply.header('Content-Type', blob.contentType)
        reply.header('Content-Length', blob.size.toString())
        reply.header('X-Cache', 'MISS')

        return reply.send()
      } catch (error) {
        fastify.log.error('CDN head error:', error)

        if (error instanceof Error && 'statusCode' in error) {
          return reply.status(error.statusCode as number).send()
        }

        return reply.status(500).send()
      }
    },
  )
}
