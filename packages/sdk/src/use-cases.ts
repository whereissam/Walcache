/**
 * Real-World Use Case Implementations
 * 
 * Provides high-level methods for common multi-chain storage patterns:
 * - dApp Frontend Hosting with Chain-Based Routing
 * - Data Marketplaces with Gated File Access
 * - Gaming Assets with User-Generated Content
 * - Decentralized Identity (DID) Documents
 * - Cross-Chain Logs and Messaging
 * - Media Streaming with On-Chain Gating
 */

import type { SupportedChain } from './types.js'
import type { UnifiedNFTMetadata } from './metadata-normalizer.js'
import type { VerificationResult, GatingConfig } from './unified-verifier.js'
import { UnifiedVerifier } from './unified-verifier.js'
import { universalStore, type UniversalUploadOptions, type EnhancedUploadResult } from './enhanced-uploader.js'
import { CrossChainSearchEngine, type SearchCriteria, type UnifiedAsset } from './cross-chain-search.js'
import { ErrorHandler, WalcacheError, WalcacheErrorCode } from './error-handler.js'

/**
 * Configuration for use case implementations
 */
interface UseCaseConfig {
  baseUrl: string
  apiKey: string
  defaultChain?: SupportedChain
  cacheEnabled?: boolean
}

/**
 * Gating configuration for file access
 */
interface FileGating {
  /** Type of gating */
  type: 'token_ownership' | 'nft_ownership' | 'custom_contract' | 'multi_requirement'
  /** Required token/NFT contract address */
  contractAddress?: string
  /** Minimum token balance (for ERC-20) */
  minimumBalance?: string
  /** Specific token ID (for NFT) */
  tokenId?: string
  /** Target blockchain for verification */
  chain: SupportedChain
  /** Custom verification logic */
  customVerifier?: (userAddress: string) => Promise<boolean>
  /** Multiple requirements */
  requirements?: FileGating[]
  /** Logic for multiple requirements */
  logic?: 'AND' | 'OR'
}

/**
 * Site upload options for dApp hosting
 */
interface SiteUploadOptions {
  /** Target chain for routing */
  chain: SupportedChain
  /** Site name/identifier */
  name: string
  /** Site version */
  version?: string
  /** Custom domain */
  customDomain?: string
  /** Environment (staging, production) */
  environment?: 'staging' | 'production'
  /** Cache TTL for site assets */
  cacheTTL?: number
}

/**
 * Media streaming options
 */
interface MediaUploadOptions {
  /** Media type */
  type: 'video' | 'audio' | 'image' | 'document'
  /** Quality settings */
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  /** Streaming format preferences */
  formats?: string[]
  /** Gating configuration */
  gating?: FileGating
  /** Enable transcoding */
  transcode?: boolean
}

/**
 * Gaming asset options
 */
interface GameAssetOptions {
  /** Asset category */
  category: 'skin' | 'weapon' | 'character' | 'item' | 'map' | 'mod'
  /** Game identifier */
  gameId: string
  /** Asset rarity */
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  /** Tradeable status */
  tradeable?: boolean
  /** Usage permissions */
  permissions?: {
    canModify: boolean
    canShare: boolean
    canSell: boolean
  }
}

/**
 * DID document structure
 */
interface DIDDocument {
  '@context': string[]
  id: string
  controller?: string[]
  verificationMethod?: Array<{
    id: string
    type: string
    controller: string
    publicKeyMultibase?: string
    publicKeyJwk?: any
  }>
  authentication?: string[]
  assertionMethod?: string[]
  service?: Array<{
    id: string
    type: string
    serviceEndpoint: string
  }>
  [key: string]: any
}

/**
 * Main use case implementation class
 */
export class WalcacheUseCases {
  private config: UseCaseConfig
  private static instances: Map<string, WalcacheUseCases> = new Map()

  constructor(config: UseCaseConfig) {
    this.config = config
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config: UseCaseConfig): WalcacheUseCases {
    const key = `${config.baseUrl}:${config.apiKey}`
    if (!this.instances.has(key)) {
      this.instances.set(key, new WalcacheUseCases(config))
    }
    return this.instances.get(key)!
  }

  // ============================================================================
  // 1. dApp Frontend Hosting with Chain-Based Routing
  // ============================================================================

  /**
   * Upload a static site for specific chain routing
   */
  async uploadSite(
    sitePath: string | File,
    options: SiteUploadOptions
  ): Promise<{
    siteId: string
    chain: SupportedChain
    deploymentUrl: string
    version: string
    assets: string[]
  }> {
    try {
      const siteFile = typeof sitePath === 'string' 
        ? await this.createSiteArchive(sitePath)
        : sitePath

      const uploadResult = await universalStore(siteFile, {
        targetChain: options.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: `${options.name} - ${options.chain}`,
          description: `Static site deployment for ${options.name} on ${options.chain}`,
          category: 'site',
          tags: ['dapp', 'frontend', options.chain, options.environment || 'production'],
          creator: options.customDomain
        },
        optimization: {
          enabled: true,
          compression: 'medium'
        }
      })

      // Create deployment record
      const siteId = `site_${options.name}_${options.chain}_${Date.now()}`
      const version = options.version || new Date().toISOString()
      const deploymentUrl = `${this.config.baseUrl}/site/${siteId}`

      // Store site metadata for routing
      await this.storeSiteMetadata(siteId, {
        name: options.name,
        chain: options.chain,
        version,
        blobId: uploadResult.blobId,
        deploymentUrl,
        customDomain: options.customDomain,
        environment: options.environment,
        cacheTTL: options.cacheTTL || 3600,
        createdAt: new Date()
      })

      return {
        siteId,
        chain: options.chain,
        deploymentUrl,
        version,
        assets: [uploadResult.blobId]
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadSite',
        chain: options.chain,
        siteName: options.name
      })
    }
  }

  /**
   * Get site URL based on user's connected chain
   */
  async getSiteUrl(options: {
    siteName: string
    userChain?: SupportedChain
    environment?: 'staging' | 'production'
  }): Promise<{
    url: string
    chain: SupportedChain
    version: string
    fallbackUrls: string[]
  }> {
    try {
      // Detect user chain if not provided
      const userChain = options.userChain || await this.detectUserChain()
      
      // Try to find site for user's chain
      const siteMetadata = await this.getSiteMetadata(
        options.siteName, 
        userChain, 
        options.environment
      )

      if (siteMetadata) {
        return {
          url: siteMetadata.customDomain || siteMetadata.deploymentUrl,
          chain: userChain,
          version: siteMetadata.version,
          fallbackUrls: await this.getFallbackSiteUrls(options.siteName)
        }
      }

      // Fallback to default chain if site not found for user's chain
      const fallbackChain = this.config.defaultChain || 'sui'
      const fallbackSite = await this.getSiteMetadata(
        options.siteName,
        fallbackChain,
        options.environment
      )

      if (!fallbackSite) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `Site ${options.siteName} not found for any supported chain`
        )
      }

      return {
        url: fallbackSite.deploymentUrl,
        chain: fallbackChain,
        version: fallbackSite.version,
        fallbackUrls: []
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.ASSET_NOT_FOUND, {
        operation: 'getSiteUrl',
        siteName: options.siteName,
        userChain: options.userChain
      })
    }
  }

  /**
   * Detect user's connected blockchain
   */
  async detectUserChain(): Promise<SupportedChain> {
    // In browser environment, check wallet connections
    if (typeof window !== 'undefined') {
      // Check for Ethereum wallets
      if ((window as any).ethereum) {
        try {
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' })
          if (chainId === '0x1' || chainId === '0x5') return 'ethereum'
        } catch {}
      }

      // Check for Sui wallets
      if ((window as any).suiWallet || (window as any).sui) {
        return 'sui'
      }

      // Check for Solana wallets
      if ((window as any).solana || (window as any).phantom) {
        return 'solana'
      }
    }

    // Default to configured chain or Sui
    return this.config.defaultChain || 'sui'
  }

  // ============================================================================
  // 2. Data Marketplaces with Gated File Access
  // ============================================================================

  /**
   * Upload file with gating configuration
   */
  async uploadGatedFile(
    file: File,
    options: {
      gating: FileGating
      metadata?: {
        name?: string
        description?: string
        price?: { amount: number; currency: string }
        license?: string
      }
      permanent?: boolean
    }
  ): Promise<{
    fileId: string
    accessUrl: string
    gating: FileGating
    metadata: any
  }> {
    try {
      const uploadResult = await universalStore(file, {
        targetChain: options.gating.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: options.metadata?.name || file.name,
          description: options.metadata?.description,
          category: 'gated-data',
          tags: ['marketplace', 'gated', options.gating.chain],
          license: options.metadata?.license
        },
        access: {
          type: 'token-gated',
          tokenRequirements: {
            contractAddress: options.gating.contractAddress!,
            minimumBalance: options.gating.minimumBalance || '1',
            tokenType: options.gating.type === 'nft_ownership' ? 'ERC721' : 'ERC20'
          }
        }
      })

      const fileId = `gated_${uploadResult.blobId}`
      const accessUrl = `${this.config.baseUrl}/gated/${fileId}`

      // Store gating configuration
      await this.storeGatingConfig(fileId, {
        blobId: uploadResult.blobId,
        gating: options.gating,
        metadata: options.metadata,
        permanent: options.permanent || false,
        createdAt: new Date()
      })

      return {
        fileId,
        accessUrl,
        gating: options.gating,
        metadata: options.metadata
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadGatedFile',
        chain: options.gating.chain,
        fileName: file.name
      })
    }
  }

  /**
   * Verify access to gated file
   */
  async verifyAccess(options: {
    fileId: string
    userAddress: string
    chain?: SupportedChain
  }): Promise<{
    hasAccess: boolean
    reason?: string
    downloadUrl?: string
    verificationResult: VerificationResult
  }> {
    try {
      const gatingConfig = await this.getGatingConfig(options.fileId)
      if (!gatingConfig) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `Gated file ${options.fileId} not found`
        )
      }

      const chain = options.chain || gatingConfig.gating.chain
      
      // Convert FileGating to VerificationOptions
      const verificationResult = await UnifiedVerifier.verifyOwnership(
        options.userAddress,
        gatingConfig.gating.contractAddress!,
        chain,
        {
          type: gatingConfig.gating.type === 'nft_ownership' ? 'nft_ownership' : 'token_balance',
          contractAddress: gatingConfig.gating.contractAddress,
          tokenId: gatingConfig.gating.tokenId,
          minimumBalance: gatingConfig.gating.minimumBalance,
          cacheDuration: 300 // Cache for 5 minutes
        }
      )

      if (verificationResult.hasAccess) {
        const downloadUrl = `${this.config.baseUrl}/download/${gatingConfig.blobId}?token=${await this.generateAccessToken(options.userAddress, options.fileId)}`
        
        return {
          hasAccess: true,
          downloadUrl,
          verificationResult
        }
      }

      return {
        hasAccess: false,
        reason: verificationResult.error?.message || 'Access requirements not met',
        verificationResult
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.VERIFICATION_FAILED, {
        operation: 'verifyAccess',
        fileId: options.fileId,
        userAddress: options.userAddress
      })
    }
  }

  /**
   * Download gated file (after access verification)
   */
  async downloadGatedFile(
    fileId: string,
    userAddress: string,
    accessToken: string
  ): Promise<{
    fileUrl: string
    expiresAt: Date
    fileInfo: {
      name: string
      size: number
      type: string
    }
  }> {
    try {
      // Verify access token
      const isValidToken = await this.verifyAccessToken(accessToken, userAddress, fileId)
      if (!isValidToken) {
        throw new WalcacheError(
          WalcacheErrorCode.ACCESS_DENIED,
          'Invalid or expired access token'
        )
      }

      const gatingConfig = await this.getGatingConfig(fileId)
      if (!gatingConfig) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `File ${fileId} not found`
        )
      }

      const fileUrl = `${this.config.baseUrl}/cdn/${gatingConfig.blobId}`
      const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

      return {
        fileUrl,
        expiresAt,
        fileInfo: {
          name: gatingConfig.metadata?.name || 'download',
          size: 0, // Would be populated from actual file metadata
          type: 'application/octet-stream' // Would be detected from file
        }
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.ACCESS_DENIED, {
        operation: 'downloadGatedFile',
        fileId,
        userAddress
      })
    }
  }

  // ============================================================================
  // 3. Gaming Assets with User-Generated Content
  // ============================================================================

  /**
   * Upload gaming asset
   */
  async uploadAsset(
    file: File,
    options: GameAssetOptions & {
      owner: string
      chain: SupportedChain
      metadata?: any
    }
  ): Promise<{
    assetId: string
    owner: string
    chain: SupportedChain
    assetUrl: string
    metadata: UnifiedNFTMetadata
  }> {
    try {
      const uploadResult = await universalStore(file, {
        targetChain: options.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: options.metadata?.name || `${options.category} - ${file.name}`,
          description: options.metadata?.description || `Gaming ${options.category} for ${options.gameId}`,
          category: 'game-asset',
          tags: [
            'gaming',
            options.gameId,
            options.category,
            options.rarity || 'common',
            options.chain
          ],
          creator: options.owner,
          attributes: [
            { trait_type: 'Game', value: options.gameId },
            { trait_type: 'Category', value: options.category },
            { trait_type: 'Rarity', value: options.rarity || 'common' },
            { trait_type: 'Tradeable', value: options.tradeable ? 'Yes' : 'No' },
            ...(options.metadata?.attributes || [])
          ]
        },
        contract: {
          autoDeploy: true,
          collection: {
            name: `${options.gameId} Assets`,
            symbol: options.gameId.toUpperCase().slice(0, 6)
          }
        }
      })

      const assetId = `asset_${options.gameId}_${uploadResult.blobId}`

      // Store gaming asset metadata
      await this.storeGameAssetMetadata(assetId, {
        blobId: uploadResult.blobId,
        owner: options.owner,
        chain: options.chain,
        gameId: options.gameId,
        category: options.category,
        rarity: options.rarity,
        tradeable: options.tradeable,
        permissions: options.permissions,
        contractAddress: uploadResult.contractAddress,
        tokenId: uploadResult.tokenId,
        createdAt: new Date()
      })

      return {
        assetId,
        owner: options.owner,
        chain: options.chain,
        assetUrl: uploadResult.cdnUrl,
        metadata: uploadResult.optimization as any // This would be properly typed
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadAsset',
        chain: options.chain,
        gameId: options.gameId,
        owner: options.owner
      })
    }
  }

  /**
   * List assets for a user/game
   */
  async listAssets(options: {
    owner?: string
    gameId?: string
    chain?: SupportedChain
    category?: string
    rarity?: string
    limit?: number
    offset?: number
  }): Promise<{
    assets: Array<{
      assetId: string
      owner: string
      gameId: string
      category: string
      rarity: string
      assetUrl: string
      tradeable: boolean
      metadata: any
    }>
    totalCount: number
    hasMore: boolean
  }> {
    try {
      const searchCriteria: SearchCriteria = {
        chains: options.chain ? [options.chain] : undefined,
        ownerAddress: options.owner,
        textSearch: options.gameId,
        attributes: [],
        limit: options.limit || 50,
        offset: options.offset || 0
      }

      // Add attribute filters
      if (options.gameId) {
        searchCriteria.attributes!.push({
          trait_type: 'Game',
          value: options.gameId
        })
      }

      if (options.category) {
        searchCriteria.attributes!.push({
          trait_type: 'Category',
          value: options.category
        })
      }

      if (options.rarity) {
        searchCriteria.attributes!.push({
          trait_type: 'Rarity',
          value: options.rarity
        })
      }

      const searchResult = await CrossChainSearchEngine.findAssetsByOwner(
        options.owner || '',
        searchCriteria
      )

      // Filter for gaming assets and convert format
      const gameAssets = searchResult.assets
        .filter(asset => 
          asset.metadata.category === 'game-asset' &&
          (!options.gameId || asset.metadata.attributes.some(attr => 
            attr.trait_type === 'Game' && attr.value === options.gameId
          ))
        )
        .map(asset => ({
          assetId: asset.id,
          owner: asset.ownership.currentOwner,
          gameId: asset.metadata.attributes.find(attr => attr.trait_type === 'Game')?.value as string || '',
          category: asset.metadata.attributes.find(attr => attr.trait_type === 'Category')?.value as string || '',
          rarity: asset.metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value as string || 'common',
          assetUrl: asset.metadata.image,
          tradeable: asset.metadata.attributes.find(attr => attr.trait_type === 'Tradeable')?.value === 'Yes',
          metadata: asset.metadata
        }))

      return {
        assets: gameAssets,
        totalCount: gameAssets.length,
        hasMore: searchResult.pagination.hasNext
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.SEARCH_FAILED, {
        operation: 'listAssets',
        owner: options.owner,
        gameId: options.gameId
      })
    }
  }

  // ============================================================================
  // 4. Decentralized Identity (DID) Documents
  // ============================================================================

  /**
   * Upload DID document
   */
  async uploadDID(
    did: string,
    document: DIDDocument | string,
    options: {
      chain: SupportedChain
      controller?: string
      updatePolicy?: 'owner_only' | 'controller_only' | 'multi_sig'
    }
  ): Promise<{
    did: string
    documentUrl: string
    chain: SupportedChain
    version: number
  }> {
    try {
      const documentContent = typeof document === 'string' 
        ? document 
        : JSON.stringify(document, null, 2)

      const documentFile = new File([documentContent], `${did.replace(/[^a-zA-Z0-9]/g, '_')}.json`, {
        type: 'application/json'
      })

      const uploadResult = await universalStore(documentFile, {
        targetChain: options.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: `DID Document: ${did}`,
          description: `Decentralized Identity Document for ${did}`,
          category: 'identity',
          tags: ['did', 'identity', options.chain],
          creator: options.controller
        }
      })

      const version = await this.getNextDIDVersion(did)
      const documentUrl = `${this.config.baseUrl}/did/${encodeURIComponent(did)}`

      // Store DID metadata
      await this.storeDIDMetadata(did, {
        blobId: uploadResult.blobId,
        chain: options.chain,
        controller: options.controller,
        updatePolicy: options.updatePolicy || 'owner_only',
        version,
        documentUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      return {
        did,
        documentUrl,
        chain: options.chain,
        version
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadDID',
        did,
        chain: options.chain
      })
    }
  }

  /**
   * Resolve DID document
   */
  async resolveDID(did: string): Promise<{
    document: DIDDocument
    metadata: {
      chain: SupportedChain
      version: number
      lastUpdated: Date
      documentUrl: string
    }
  }> {
    try {
      const didMetadata = await this.getDIDMetadata(did)
      if (!didMetadata) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `DID document not found: ${did}`
        )
      }

      // Fetch document content from CDN
      const documentUrl = `${this.config.baseUrl}/cdn/${didMetadata.blobId}`
      const response = await fetch(documentUrl)
      
      if (!response.ok) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `Failed to fetch DID document: ${response.statusText}`
        )
      }

      const documentText = await response.text()
      const document: DIDDocument = JSON.parse(documentText)

      return {
        document,
        metadata: {
          chain: didMetadata.chain,
          version: didMetadata.version,
          lastUpdated: didMetadata.updatedAt,
          documentUrl: didMetadata.documentUrl
        }
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.ASSET_NOT_FOUND, {
        operation: 'resolveDID',
        did
      })
    }
  }

  // ============================================================================
  // 5. Cross-Chain Logs and Messaging
  // ============================================================================

  /**
   * Upload log file
   */
  async uploadLog(
    logContent: string | File,
    options: {
      chain: SupportedChain
      logType: 'audit' | 'transaction' | 'event' | 'proof' | 'message'
      metadata?: {
        timestamp?: Date
        source?: string
        level?: 'info' | 'warn' | 'error' | 'debug'
        tags?: string[]
      }
    }
  ): Promise<{
    logId: string
    logHash: string
    referenceHash: string
    chain: SupportedChain
    logUrl: string
  }> {
    try {
      const logFile = typeof logContent === 'string'
        ? new File([logContent], `log_${Date.now()}.txt`, { type: 'text/plain' })
        : logContent

      const uploadResult = await universalStore(logFile, {
        targetChain: options.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: `Log: ${options.logType}`,
          description: `${options.logType} log entry`,
          category: 'log',
          tags: ['log', options.logType, options.chain, ...(options.metadata?.tags || [])],
          creator: options.metadata?.source
        }
      })

      const logId = `log_${options.logType}_${uploadResult.blobId}`
      const logHash = await this.calculateContentHash(logContent)
      const referenceHash = await this.generateReferenceHash(logId, options.chain)

      // Store log metadata
      await this.storeLogMetadata(logId, {
        blobId: uploadResult.blobId,
        logHash,
        referenceHash,
        chain: options.chain,
        logType: options.logType,
        metadata: options.metadata,
        createdAt: new Date()
      })

      return {
        logId,
        logHash,
        referenceHash,
        chain: options.chain,
        logUrl: uploadResult.cdnUrl
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadLog',
        chain: options.chain,
        logType: options.logType
      })
    }
  }

  /**
   * Get log reference for smart contract usage
   */
  async getLogReference(logId: string): Promise<{
    referenceHash: string
    verificationUrl: string
    proof: {
      logHash: string
      chain: SupportedChain
      timestamp: Date
      blobId: string
    }
  }> {
    try {
      const logMetadata = await this.getLogMetadata(logId)
      if (!logMetadata) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `Log not found: ${logId}`
        )
      }

      const verificationUrl = `${this.config.baseUrl}/verify/log/${logId}`

      return {
        referenceHash: logMetadata.referenceHash,
        verificationUrl,
        proof: {
          logHash: logMetadata.logHash,
          chain: logMetadata.chain,
          timestamp: logMetadata.createdAt,
          blobId: logMetadata.blobId
        }
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.ASSET_NOT_FOUND, {
        operation: 'getLogReference',
        logId
      })
    }
  }

  // ============================================================================
  // 6. Media Streaming with On-Chain Gating
  // ============================================================================

  /**
   * Upload media with gating
   */
  async uploadMedia(
    file: File,
    options: MediaUploadOptions & {
      chain: SupportedChain
      metadata?: {
        title?: string
        description?: string
        artist?: string
        album?: string
        duration?: number
      }
    }
  ): Promise<{
    mediaId: string
    streamUrl: string
    chain: SupportedChain
    gating?: FileGating
    formats: string[]
  }> {
    try {
      const uploadResult = await universalStore(file, {
        targetChain: options.chain,
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        metadata: {
          name: options.metadata?.title || file.name,
          description: options.metadata?.description,
          category: options.type,
          tags: ['media', options.type, options.chain],
          creator: options.metadata?.artist
        },
        optimization: {
          enabled: true,
          formats: options.formats || this.getDefaultFormats(options.type),
          compression: options.quality === 'high' ? 'light' : 'medium'
        },
        access: options.gating ? {
          type: 'token-gated',
          tokenRequirements: {
            contractAddress: options.gating.contractAddress!,
            minimumBalance: options.gating.minimumBalance || '1',
            tokenType: options.gating.type === 'nft_ownership' ? 'ERC721' : 'ERC20'
          }
        } : undefined
      })

      const mediaId = `media_${options.type}_${uploadResult.blobId}`
      const streamUrl = `${this.config.baseUrl}/stream/${mediaId}`

      // Store media metadata
      await this.storeMediaMetadata(mediaId, {
        blobId: uploadResult.blobId,
        chain: options.chain,
        type: options.type,
        gating: options.gating,
        metadata: options.metadata,
        formats: options.formats || this.getDefaultFormats(options.type),
        quality: options.quality,
        createdAt: new Date()
      })

      return {
        mediaId,
        streamUrl,
        chain: options.chain,
        gating: options.gating,
        formats: options.formats || this.getDefaultFormats(options.type)
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.UPLOAD_FAILED, {
        operation: 'uploadMedia',
        chain: options.chain,
        mediaType: options.type
      })
    }
  }

  /**
   * Get streaming URL with access verification
   */
  async streamMedia(
    mediaId: string,
    userAddress: string,
    options: {
      quality?: 'low' | 'medium' | 'high'
      format?: string
    } = {}
  ): Promise<{
    streamUrl: string
    hasAccess: boolean
    expiresAt: Date
    formats: Array<{
      format: string
      quality: string
      url: string
      bitrate?: number
    }>
  }> {
    try {
      const mediaMetadata = await this.getMediaMetadata(mediaId)
      if (!mediaMetadata) {
        throw new WalcacheError(
          WalcacheErrorCode.ASSET_NOT_FOUND,
          `Media not found: ${mediaId}`
        )
      }

      let hasAccess = true
      let accessToken = ''

      // Check gating if required
      if (mediaMetadata.gating) {
        const accessResult = await this.verifyAccess({
          fileId: mediaId,
          userAddress,
          chain: mediaMetadata.chain
        })

        hasAccess = accessResult.hasAccess
        if (hasAccess) {
          accessToken = await this.generateAccessToken(userAddress, mediaId)
        }
      }

      if (!hasAccess) {
        return {
          streamUrl: '',
          hasAccess: false,
          expiresAt: new Date(),
          formats: []
        }
      }

      const baseStreamUrl = `${this.config.baseUrl}/stream/${mediaId}`
      const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

      // Generate format URLs
      const formats = mediaMetadata.formats.map(format => ({
        format,
        quality: options.quality || 'medium',
        url: `${baseStreamUrl}/${format}?token=${accessToken}&quality=${options.quality || 'medium'}`,
        bitrate: this.getBitrateForFormat(format, options.quality || 'medium')
      }))

      const streamUrl = formats.find(f => f.format === options.format)?.url || formats[0]?.url || baseStreamUrl

      return {
        streamUrl,
        hasAccess,
        expiresAt,
        formats
      }

    } catch (error) {
      throw ErrorHandler.createError(error, WalcacheErrorCode.ACCESS_DENIED, {
        operation: 'streamMedia',
        mediaId,
        userAddress
      })
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async createSiteArchive(sitePath: string): Promise<File> {
    // In real implementation, this would create a ZIP archive of the site
    // For now, simulate with a simple file
    const content = `Site archive for ${sitePath}`
    return new File([content], 'site.zip', { type: 'application/zip' })
  }

  private async storeSiteMetadata(siteId: string, metadata: any): Promise<void> {
    // Store in database or key-value store
    console.log(`Storing site metadata for ${siteId}:`, metadata)
  }

  private async getSiteMetadata(siteName: string, chain: SupportedChain, environment?: string): Promise<any> {
    // Retrieve from database
    return {
      name: siteName,
      chain,
      version: '1.0.0',
      deploymentUrl: `https://cdn.walcache.com/site/${siteName}_${chain}`,
      environment: environment || 'production'
    }
  }

  private async getFallbackSiteUrls(siteName: string): Promise<string[]> {
    return [
      `https://cdn.walcache.com/site/${siteName}_ethereum`,
      `https://cdn.walcache.com/site/${siteName}_sui`,
      `https://cdn.walcache.com/site/${siteName}_solana`
    ]
  }

  private async storeGatingConfig(fileId: string, config: any): Promise<void> {
    console.log(`Storing gating config for ${fileId}:`, config)
  }

  private async getGatingConfig(fileId: string): Promise<any> {
    return {
      blobId: 'mock_blob_id',
      gating: {
        type: 'nft_ownership',
        contractAddress: '0x123...',
        chain: 'ethereum'
      },
      metadata: { name: 'Test File' }
    }
  }

  private async generateAccessToken(userAddress: string, fileId: string): Promise<string> {
    // Generate JWT or similar token
    return Buffer.from(`${userAddress}:${fileId}:${Date.now()}`).toString('base64')
  }

  private async verifyAccessToken(token: string, userAddress: string, fileId: string): Promise<boolean> {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [tokenAddress, tokenFileId, timestamp] = decoded.split(':')
      
      // Check if token is valid and not expired (1 hour)
      return tokenAddress === userAddress && 
             tokenFileId === fileId && 
             Date.now() - parseInt(timestamp) < 3600000
    } catch {
      return false
    }
  }

  private async storeGameAssetMetadata(assetId: string, metadata: any): Promise<void> {
    console.log(`Storing game asset metadata for ${assetId}:`, metadata)
  }

  private async storeDIDMetadata(did: string, metadata: any): Promise<void> {
    console.log(`Storing DID metadata for ${did}:`, metadata)
  }

  private async getDIDMetadata(did: string): Promise<any> {
    return {
      blobId: 'mock_did_blob',
      chain: 'sui' as SupportedChain,
      version: 1,
      documentUrl: `https://cdn.walcache.com/did/${encodeURIComponent(did)}`,
      updatedAt: new Date()
    }
  }

  private async getNextDIDVersion(did: string): Promise<number> {
    // Get current version and increment
    return 1
  }

  private async storeLogMetadata(logId: string, metadata: any): Promise<void> {
    console.log(`Storing log metadata for ${logId}:`, metadata)
  }

  private async getLogMetadata(logId: string): Promise<any> {
    return {
      blobId: 'mock_log_blob',
      logHash: 'mock_log_hash',
      referenceHash: 'mock_reference_hash',
      chain: 'ethereum' as SupportedChain,
      createdAt: new Date()
    }
  }

  private async calculateContentHash(content: string | File): Promise<string> {
    // Calculate SHA-256 hash
    const text = typeof content === 'string' ? content : await content.text()
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async generateReferenceHash(logId: string, chain: SupportedChain): Promise<string> {
    return this.calculateContentHash(`${logId}:${chain}:${Date.now()}`)
  }

  private async storeMediaMetadata(mediaId: string, metadata: any): Promise<void> {
    console.log(`Storing media metadata for ${mediaId}:`, metadata)
  }

  private async getMediaMetadata(mediaId: string): Promise<any> {
    return {
      blobId: 'mock_media_blob',
      chain: 'ethereum' as SupportedChain,
      type: 'video' as const,
      formats: ['mp4', 'webm'],
      gating: {
        type: 'nft_ownership',
        contractAddress: '0x123...',
        chain: 'ethereum' as SupportedChain
      },
      createdAt: new Date()
    }
  }

  private getDefaultFormats(type: string): string[] {
    switch (type) {
      case 'video':
        return ['mp4', 'webm']
      case 'audio':
        return ['mp3', 'ogg']
      case 'image':
        return ['webp', 'jpg']
      default:
        return ['original']
    }
  }

  private getBitrateForFormat(format: string, quality: string): number {
    const bitrateMap: Record<string, Record<string, number>> = {
      'mp4': { low: 500, medium: 1500, high: 5000 },
      'webm': { low: 400, medium: 1200, high: 4000 },
      'mp3': { low: 128, medium: 256, high: 320 }
    }
    return bitrateMap[format]?.[quality] || 1000
  }
}

// Export convenience functions
export const createUseCases = (config: UseCaseConfig) => WalcacheUseCases.getInstance(config)

// Export types for developers
export type {
  UseCaseConfig,
  FileGating,
  SiteUploadOptions,
  MediaUploadOptions,
  GameAssetOptions,
  DIDDocument
}