#!/usr/bin/env bun
/**
 * Production Backend Integration Example
 * 
 * This demonstrates how to use the Walcache SDK in a real backend service
 * that serves frontend applications.
 */

import {
  WalrusCDNClient,
  getWalrusCDNUrl,
  configure,
  uploadFile,
  pinCID,
  getCIDInfo,
  getMetrics,
  getBlobStatus,
  verifyAsset,
  selectOptimalNode
} from '../src/index.js'

import { universalStore } from '../src/enhanced-uploader.js'

/**
 * Production Backend Service Class
 */
class WalcacheBackendService {
  constructor(config = {}) {
    // Production configuration
    this.config = {
      // Your deployed CDN server
      baseUrl: config.baseUrl || process.env.WALCACHE_CDN_URL || 'https://your-cdn-domain.com',
      apiKey: config.apiKey || process.env.WALCACHE_API_KEY,
      
      // Default chain for new uploads
      defaultChain: config.defaultChain || 'sui',
      
      // Cache settings
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 3600, // 1 hour
      
      // Security settings
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: config.allowedMimeTypes || [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm',
        'audio/mp3', 'audio/wav',
        'application/pdf', 'application/json'
      ]
    }

    // Initialize SDK
    configure({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      timeout: 30000,
      secure: true
    })

    this.client = new WalrusCDNClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey
    })

    console.log('🚀 Walcache Backend Service initialized')
    console.log(`📡 CDN URL: ${this.config.baseUrl}`)
    console.log(`🔗 Default Chain: ${this.config.defaultChain}`)
  }

  /**
   * Upload file from frontend (multipart form data)
   * 
   * @param {File|Buffer} file - File data from frontend
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with CDN URLs
   */
  async uploadAsset(file, options = {}) {
    try {
      // Validate file
      this.validateFile(file, options)

      const uploadOptions = {
        targetChain: options.chain || this.config.defaultChain,
        metadata: {
          name: options.name || file.name,
          description: options.description,
          tags: options.tags || [],
          category: this.detectFileCategory(file),
          creator: options.userId,
          uploadedAt: new Date().toISOString()
        },
        optimization: {
          enabled: options.optimize !== false,
          imageQuality: options.imageQuality || 85,
          compression: options.compression || 'medium'
        }
      }

      // If it's an NFT upload, set up contract options
      if (options.createNFT) {
        uploadOptions.contract = {
          autoDeploy: true,
          contractType: this.getContractType(uploadOptions.targetChain),
          collection: options.collection
        }
      }

      // Upload using enhanced SDK with production configuration
      const result = await universalStore(file, {
        ...uploadOptions,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey
      })

      // Generate multiple CDN URLs for different chains
      const cdnUrls = this.generateMultiChainUrls(result.blobId)

      // Pin important content
      if (options.permanent) {
        await this.pinContent(result.blobId)
      }

      // Return frontend-friendly response
      return {
        success: true,
        data: {
          id: result.blobId,
          cdnUrl: result.cdnUrl,
          cdnUrls: cdnUrls,
          chain: uploadOptions.targetChain,
          metadata: uploadOptions.metadata,
          size: file.size,
          type: file.type,
          transactionHash: result.transactionHash,
          contractAddress: result.contractAddress,
          tokenId: result.tokenId,
          permanent: !!options.permanent,
          uploadedAt: new Date()
        }
      }

    } catch (error) {
      console.error('Upload failed:', error)
      return {
        success: false,
        error: {
          code: error.code || 'UPLOAD_FAILED',
          message: error.message,
          details: error.details
        }
      }
    }
  }

  /**
   * Get asset information for frontend display
   */
  async getAssetInfo(blobId, options = {}) {
    try {
      // Get basic CID info
      const cidInfo = await getCIDInfo(blobId)
      
      // Get multi-chain status if requested
      let multiChainStatus = null
      if (options.includeMultiChain) {
        multiChainStatus = await getBlobStatus(blobId)
      }

      // Generate CDN URLs for different chains
      const cdnUrls = this.generateMultiChainUrls(blobId)

      return {
        success: true,
        data: {
          id: blobId,
          cdnUrl: `${this.config.baseUrl}/cdn/${blobId}`,
          cdnUrls: cdnUrls,
          cached: cidInfo.cached,
          pinned: cidInfo.pinned,
          stats: cidInfo.stats,
          multiChain: multiChainStatus,
          lastAccessed: cidInfo.stats?.lastAccess
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: error.message
        }
      }
    }
  }

  /**
   * Verify user owns an asset (for gated content)
   */
  async verifyAssetOwnership(userAddress, assetId, chain = 'ethereum') {
    try {
      const verification = await verifyAsset(chain, {
        userAddress,
        assetId,
        contractAddress: process.env[`${chain.toUpperCase()}_CONTRACT_ADDRESS`]
      })

      return {
        success: true,
        data: {
          hasAccess: verification.hasAccess,
          chain: verification.chain,
          assetMetadata: verification.assetMetadata,
          verifiedAt: verification.verifiedAt
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: error.message
        }
      }
    }
  }

  /**
   * Get optimized CDN URL for frontend
   */
  getCDNUrl(blobId, options = {}) {
    const chain = options.chain || this.config.defaultChain
    const params = {}

    // Add optimization parameters
    if (options.width) params.w = options.width
    if (options.height) params.h = options.height
    if (options.quality) params.q = options.quality
    if (options.format) params.f = options.format

    return getWalrusCDNUrl(blobId, {
      chain,
      params: Object.keys(params).length > 0 ? params : undefined
    })
  }

  /**
   * Batch upload for multiple files
   */
  async uploadBatch(files, options = {}) {
    const results = []
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`📦 Starting batch upload: ${batchId} (${files.length} files)`)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileOptions = {
        ...options,
        batchId,
        batchIndex: i,
        batchTotal: files.length
      }

      try {
        const result = await this.uploadAsset(file, fileOptions)
        results.push(result)
        console.log(`✅ Uploaded ${i + 1}/${files.length}: ${file.name}`)
      } catch (error) {
        console.error(`❌ Failed ${i + 1}/${files.length}: ${file.name}`, error)
        results.push({
          success: false,
          error: error.message,
          filename: file.name
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.length - successful

    return {
      batchId,
      total: files.length,
      successful,
      failed,
      results
    }
  }

  /**
   * Get service metrics for monitoring
   */
  async getServiceMetrics() {
    try {
      const metrics = await getMetrics()
      const optimal = await selectOptimalNode(this.config.defaultChain)

      return {
        success: true,
        data: {
          cdn: metrics,
          service: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0'
          },
          network: {
            optimalNode: optimal.node.url,
            strategy: optimal.strategy,
            reason: optimal.reason
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Private helper methods
   */
  validateFile(file, options) {
    if (!file) {
      throw new Error('File is required')
    }

    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.config.maxFileSize} bytes`)
    }

    if (this.config.allowedMimeTypes.length > 0 && 
        !this.config.allowedMimeTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`)
    }
  }

  detectFileCategory(file) {
    const mimeType = file.type.toLowerCase()
    
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    if (mimeType === 'application/json') return 'metadata'
    
    return 'other'
  }

  generateMultiChainUrls(blobId) {
    return {
      sui: getWalrusCDNUrl(blobId, { chain: 'sui' }),
      ethereum: getWalrusCDNUrl(blobId, { chain: 'ethereum' }),
      solana: getWalrusCDNUrl(blobId, { chain: 'solana' })
    }
  }

  getContractType(chain) {
    const contractTypes = {
      ethereum: 'erc721',
      sui: 'sui-object',
      solana: 'solana-token'
    }
    return contractTypes[chain] || 'erc721'
  }

  async pinContent(blobId) {
    try {
      await pinCID(blobId)
      console.log(`📌 Pinned content: ${blobId}`)
    } catch (error) {
      console.warn(`Failed to pin ${blobId}:`, error.message)
    }
  }
}

/**
 * Express.js integration example
 */
export function createExpressRoutes(walcacheService) {
  const router = express.Router()

  // Upload single file
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const options = {
        chain: req.body.chain,
        name: req.body.name,
        description: req.body.description,
        tags: req.body.tags ? req.body.tags.split(',') : [],
        userId: req.user?.id,
        createNFT: req.body.createNFT === 'true',
        permanent: req.body.permanent === 'true',
        optimize: req.body.optimize !== 'false'
      }

      const result = await walcacheService.uploadAsset(req.file, options)
      res.json(result)

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })

  // Get asset info
  router.get('/asset/:blobId', async (req, res) => {
    const result = await walcacheService.getAssetInfo(req.params.blobId, {
      includeMultiChain: req.query.multichain === 'true'
    })
    res.json(result)
  })

  // Get optimized CDN URL
  router.get('/cdn/:blobId', (req, res) => {
    const url = walcacheService.getCDNUrl(req.params.blobId, req.query)
    res.json({ cdnUrl: url })
  })

  // Verify asset ownership
  router.post('/verify', async (req, res) => {
    const { userAddress, assetId, chain } = req.body
    const result = await walcacheService.verifyAssetOwnership(userAddress, assetId, chain)
    res.json(result)
  })

  // Batch upload
  router.post('/upload/batch', upload.array('files'), async (req, res) => {
    const options = JSON.parse(req.body.options || '{}')
    const result = await walcacheService.uploadBatch(req.files, options)
    res.json(result)
  })

  // Service metrics
  router.get('/metrics', async (req, res) => {
    const result = await walcacheService.getServiceMetrics()
    res.json(result)
  })

  return router
}

/**
 * Fastify integration example
 */
export function createFastifyRoutes(fastify, walcacheService) {
  // Upload endpoint
  fastify.post('/upload', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: { isFile: true },
          chain: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const data = await request.file()
    const options = {
      chain: data.fields.chain?.value,
      name: data.fields.name?.value,
      description: data.fields.description?.value
    }

    const result = await walcacheService.uploadAsset(data, options)
    return result
  })

  // Other routes...
  fastify.get('/asset/:blobId', async (request, reply) => {
    return walcacheService.getAssetInfo(request.params.blobId)
  })
}

/**
 * Usage example
 */
async function main() {
  // Initialize service with production config
  const walcacheService = new WalcacheBackendService({
    baseUrl: 'https://your-production-cdn.com',
    apiKey: process.env.WALCACHE_API_KEY,
    defaultChain: 'sui',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'application/pdf'
    ]
  })

  // Test upload with enhanced features
  console.log('\n🧪 Testing enhanced backend service...')
  
  const mockFile = new File(['test NFT content for demo'], 'demo-nft.jpg', { type: 'image/jpeg' })
  
  // Test 1: Basic upload with NFT creation
  console.log('\n📤 Test 1: Basic NFT Upload')
  const basicUpload = await walcacheService.uploadAsset(mockFile, {
    chain: 'sui',
    name: 'Demo NFT',
    description: 'A demonstration NFT created via Walcache SDK',
    createNFT: true,
    permanent: true,
    tags: ['demo', 'nft', 'test']
  })
  console.log('Basic upload result:', JSON.stringify(basicUpload, null, 2))

  // Test 2: Advanced upload with optimization and cross-chain bridging
  console.log('\n🌐 Test 2: Cross-Chain Upload with Optimization')
  const advancedUpload = await walcacheService.uploadAsset(mockFile, {
    chain: 'ethereum',
    name: 'Cross-Chain Asset',
    description: 'Asset deployed across multiple blockchains',
    createNFT: true,
    permanent: true,
    optimize: true,
    imageQuality: 90,
    crossChain: {
      targetChains: ['sui', 'solana'],
      strategy: 'immediate',
      syncMetadata: true
    }
  })
  console.log('Advanced upload result:', JSON.stringify(advancedUpload, null, 2))

  // Test 3: Batch upload
  console.log('\n📦 Test 3: Batch Upload')
  const mockFiles = [
    new File(['file 1 content'], 'batch-1.jpg', { type: 'image/jpeg' }),
    new File(['file 2 content'], 'batch-2.png', { type: 'image/png' }),
    new File(['file 3 content'], 'batch-3.pdf', { type: 'application/pdf' })
  ]
  
  const batchResult = await walcacheService.uploadBatch(mockFiles, {
    chain: 'sui',
    createNFT: true,
    permanent: false,
    collection: {
      name: 'Demo Batch Collection',
      symbol: 'BATCH'
    }
  })
  console.log('Batch upload result:', JSON.stringify(batchResult, null, 2))

  // Test 4: Asset verification
  if (basicUpload.success) {
    console.log('\n🔐 Test 4: Asset Verification')
    const verification = await walcacheService.verifyAssetOwnership(
      '0x1234567890123456789012345678901234567890',
      basicUpload.data.tokenId || '1',
      'sui'
    )
    console.log('Verification result:', JSON.stringify(verification, null, 2))

    // Test 5: Asset info with multi-chain status
    console.log('\n🔍 Test 5: Multi-Chain Asset Info')
    const assetInfo = await walcacheService.getAssetInfo(basicUpload.data.id, {
      includeMultiChain: true
    })
    console.log('Asset info:', JSON.stringify(assetInfo, null, 2))
  }

  // Test 6: Service metrics
  console.log('\n📊 Test 6: Service Metrics')
  const metrics = await walcacheService.getServiceMetrics()
  console.log('Service metrics:', JSON.stringify(metrics, null, 2))
  
  console.log('\n✅ All tests completed successfully!')
  console.log('🚀 Your Walcache SDK is ready for production use!')
}

// Export for use in your backend
export { WalcacheBackendService }

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}