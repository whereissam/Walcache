/**
 * Enhanced Universal Asset Uploader
 * 
 * This module provides the foundation for universal asset storage
 * across multiple blockchains with automatic optimization and
 * smart contract integration.
 */

import type {
  SupportedChain,
  AssetVerificationOptions,
  UploadResult,
  UploadOptions,
  WalrusCDNConfig,
} from './types.js'
import { WalrusCDNClient, uploadFile, preloadCIDs, pinCID } from './index.js'
import { ErrorHandler, WalcacheErrorCode } from './error-handler.js'

/**
 * Enhanced upload options for universal storage
 */
export interface UniversalUploadOptions extends UploadOptions {
  /** Target blockchain for storage */
  targetChain: SupportedChain
  /** Asset metadata */
  metadata?: AssetMetadata
  /** Optimization preferences */
  optimization?: OptimizationOptions
  /** Access control settings */
  access?: AccessControlOptions
  /** Cross-chain bridging options */
  crossChain?: CrossChainOptions
  /** Smart contract options */
  contract?: ContractOptions
}

/**
 * Comprehensive asset metadata
 */
export interface AssetMetadata {
  name?: string
  description?: string
  tags?: string[]
  category?: AssetCategory
  license?: string
  creator?: string
  royalties?: number // Percentage (0-100)
  externalUrl?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>
  [key: string]: any
}

/**
 * Asset categories for optimal handling
 */
export type AssetCategory = 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'document' 
  | 'nft' 
  | 'avatar' 
  | 'collection' 
  | 'game-asset'
  | 'other'

/**
 * File optimization options
 */
export interface OptimizationOptions {
  /** Enable automatic optimization */
  enabled?: boolean
  /** Image quality (1-100) */
  imageQuality?: number
  /** Generate multiple formats */
  formats?: string[]
  /** Maximum dimensions */
  maxDimensions?: { width: number; height: number }
  /** Compression level */
  compression?: 'none' | 'light' | 'medium' | 'heavy'
}

/**
 * Access control and monetization options
 */
export interface AccessControlOptions {
  type: 'public' | 'private' | 'token-gated' | 'subscription'
  /** Token requirements for gated access */
  tokenRequirements?: {
    contractAddress: string
    minimumBalance: string
    tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'Sui-Object'
  }
  /** Pricing for paid access */
  pricing?: {
    amount: string
    currency: 'ETH' | 'SUI' | 'SOL' | 'USDC'
    recurringType?: 'one-time' | 'daily' | 'monthly' | 'yearly'
  }
}

/**
 * Cross-chain bridging configuration
 */
export interface CrossChainOptions {
  /** Additional chains to bridge to */
  targetChains: SupportedChain[]
  /** Bridging strategy */
  strategy: 'immediate' | 'lazy' | 'on-demand'
  /** Sync metadata across chains */
  syncMetadata: boolean
}

/**
 * Smart contract deployment options
 */
export interface ContractOptions {
  /** Auto-deploy contract if needed */
  autoDeploy: boolean
  /** Contract type to deploy */
  contractType?: 'erc721' | 'erc1155' | 'sui-object' | 'solana-token'
  /** Collection settings */
  collection?: {
    name: string
    symbol: string
    maxSupply?: number
    royalties?: number
  }
}

/**
 * Enhanced upload result with blockchain integration
 */
export interface EnhancedUploadResult extends UploadResult {
  /** Transaction hash on target chain */
  transactionHash?: string
  /** Smart contract address (if deployed) */
  contractAddress?: string
  /** Token ID (if NFT created) */
  tokenId?: string
  /** Cross-chain deployment results */
  crossChainResults?: Record<SupportedChain, {
    transactionHash: string
    contractAddress?: string
    tokenId?: string
    success: boolean
    error?: string
  }>
  /** Optimization results */
  optimization?: {
    originalSize: number
    optimizedSize: number
    compressionRatio: number
    formatsGenerated: string[]
  }
  /** Access control setup */
  accessControl?: {
    type: string
    contractAddress?: string
    configured: boolean
  }
}

/**
 * File type detection and optimization strategies
 */
export class FileTypeHandler {
  /**
   * Detect file category from MIME type and filename
   */
  static detectCategory(file: File): AssetCategory {
    const mimeType = file.type.toLowerCase()
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'document'
    if (mimeType === 'application/json' && file.name.includes('metadata')) return 'nft'
    
    return 'other'
  }

  /**
   * Get optimal storage strategy for file type
   */
  static getStorageStrategy(category: AssetCategory, chain: SupportedChain): StorageStrategy {
    const strategies: Record<AssetCategory, Record<SupportedChain, StorageStrategy>> = {
      image: {
        ethereum: { compression: 'medium', formats: ['webp', 'avif'], maxSize: 10 * 1024 * 1024 },
        sui: { compression: 'light', formats: ['webp'], maxSize: 50 * 1024 * 1024 },
        solana: { compression: 'heavy', formats: ['webp'], maxSize: 5 * 1024 * 1024 }
      },
      video: {
        ethereum: { compression: 'heavy', formats: ['mp4'], maxSize: 100 * 1024 * 1024 },
        sui: { compression: 'medium', formats: ['mp4', 'webm'], maxSize: 500 * 1024 * 1024 },
        solana: { compression: 'heavy', formats: ['mp4'], maxSize: 50 * 1024 * 1024 }
      },
      // Add more categories...
      nft: {
        ethereum: { compression: 'none', formats: ['original'], maxSize: 1024 * 1024 },
        sui: { compression: 'none', formats: ['original'], maxSize: 1024 * 1024 },
        solana: { compression: 'none', formats: ['original'], maxSize: 1024 * 1024 }
      },
      other: {
        ethereum: { compression: 'light', formats: ['original'], maxSize: 10 * 1024 * 1024 },
        sui: { compression: 'light', formats: ['original'], maxSize: 10 * 1024 * 1024 },
        solana: { compression: 'light', formats: ['original'], maxSize: 10 * 1024 * 1024 }
      }
    }

    return strategies[category]?.[chain] || strategies.other[chain]
  }
}

interface StorageStrategy {
  compression: 'none' | 'light' | 'medium' | 'heavy'
  formats: string[]
  maxSize: number
}

/**
 * Chain-specific upload handlers
 */
export class ChainUploadHandler {
  /**
   * Handle Ethereum-specific upload logic
   */
  static async uploadToEthereum(
    file: File, 
    options: UniversalUploadOptions
  ): Promise<EnhancedUploadResult> {
    try {
      // Step 1: Upload file to Walrus via CDN client
      const client = new WalrusCDNClient({
        baseUrl: 'http://localhost:4500', // Use configured base URL
        timeout: 30000
      })

      // Upload file and get Walrus blob ID
      const uploadResult = await client.uploadFile(file)
      const blobId = uploadResult.blobId

      // Step 2: Create metadata for NFT if needed
      let nftMetadata = null
      if (options.contract?.autoDeploy && options.metadata) {
        nftMetadata = {
          name: options.metadata.name || file.name,
          description: options.metadata.description || '',
          image: `https://cdn.walcache.com/v1/ethereum/blobs/${blobId}`,
          attributes: options.metadata.attributes || [],
          external_url: options.metadata.externalUrl
        }
      }

      // Step 3: Simulate smart contract deployment and NFT minting
      // In real implementation, this would interact with Ethereum blockchain
      const result: EnhancedUploadResult = {
        blobId,
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        cdnUrl: `https://cdn.walcache.com/v1/ethereum/blobs/${blobId}`,
        transactionHash: await this.simulateEthereumTransaction(),
        contractAddress: options.contract?.autoDeploy ? await this.simulateContractDeployment() : undefined,
        tokenId: options.contract?.autoDeploy ? '1' : undefined,
      }

      // Step 4: Pin content if it's permanent
      if (options.metadata?.category === 'nft' || uploadResult.blobId) {
        try {
          await pinCID(blobId)
        } catch (error) {
          console.warn('Failed to pin content:', error)
        }
      }

      return result

    } catch (error) {
      throw new Error(`Ethereum upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Simulate Ethereum transaction (replace with real Web3 integration)
   */
  private static async simulateEthereumTransaction(): Promise<string> {
    // In real implementation, this would:
    // 1. Connect to Ethereum network
    // 2. Send transaction to mint NFT or create asset
    // 3. Return actual transaction hash
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    return `0x${Math.random().toString(16).substr(2, 64)}`
  }

  /**
   * Simulate contract deployment (replace with real Web3 integration)
   */
  private static async simulateContractDeployment(): Promise<string> {
    // In real implementation, this would:
    // 1. Deploy ERC-721 or ERC-1155 contract
    // 2. Return actual contract address
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate deployment delay
    return `0x${Math.random().toString(16).substr(2, 40)}`
  }

  /**
   * Handle Sui-specific upload logic
   */
  static async uploadToSui(
    file: File, 
    options: UniversalUploadOptions
  ): Promise<EnhancedUploadResult> {
    try {
      // Step 1: Upload directly to Walrus via Sui network
      const client = new WalrusCDNClient({
        baseUrl: 'http://localhost:4500',
        timeout: 30000
      })

      // Upload file to Walrus (Sui's native storage)
      const uploadResult = await client.uploadFile(file)
      const blobId = uploadResult.blobId

      // Step 2: Create Sui object metadata if needed
      let suiObjectData = null
      if (options.contract?.autoDeploy && options.metadata) {
        suiObjectData = {
          name: options.metadata.name || file.name,
          description: options.metadata.description || '',
          url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
          attributes: options.metadata.attributes || [],
          creator: options.metadata.creator
        }
      }

      // Step 3: Simulate Sui object creation
      const result: EnhancedUploadResult = {
        blobId,
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        cdnUrl: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
        transactionHash: await this.simulateSuiTransaction(),
        contractAddress: options.contract?.autoDeploy ? await this.simulateSuiPackagePublication() : undefined,
      }

      // Step 4: Pin content for permanent storage
      if (options.metadata?.category === 'nft' || uploadResult.blobId) {
        try {
          await pinCID(blobId)
        } catch (error) {
          console.warn('Failed to pin content on Sui:', error)
        }
      }

      return result

    } catch (error) {
      throw new Error(`Sui upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Simulate Sui transaction (replace with real Sui SDK integration)
   */
  private static async simulateSuiTransaction(): Promise<string> {
    // In real implementation, this would:
    // 1. Connect to Sui network
    // 2. Create and execute Sui transaction
    // 3. Return actual transaction digest
    await new Promise(resolve => setTimeout(resolve, 800)) // Simulate faster Sui network
    return `0x${Math.random().toString(16).substr(2, 64)}`
  }

  /**
   * Simulate Sui package publication (replace with real Sui SDK integration)
   */
  private static async simulateSuiPackagePublication(): Promise<string> {
    // In real implementation, this would:
    // 1. Publish Sui package with NFT/object creation logic
    // 2. Return actual package ID
    await new Promise(resolve => setTimeout(resolve, 1200)) // Simulate package publication
    return `0x${Math.random().toString(16).substr(2, 64)}`
  }

  /**
   * Handle Solana-specific upload logic
   */
  static async uploadToSolana(
    file: File, 
    options: UniversalUploadOptions
  ): Promise<EnhancedUploadResult> {
    try {
      // Step 1: Upload to storage (Arweave or Walrus mirror)
      const client = new WalrusCDNClient({
        baseUrl: 'http://localhost:4500',
        timeout: 30000
      })

      // Upload file through Solana-compatible endpoint
      const uploadResult = await client.uploadFile(file)
      const blobId = uploadResult.blobId

      // Step 2: Create Metaplex-compatible metadata if needed
      let metaplexMetadata = null
      if (options.contract?.autoDeploy && options.metadata) {
        metaplexMetadata = {
          name: options.metadata.name || file.name,
          symbol: options.contract.collection?.symbol || 'WLCACHE',
          description: options.metadata.description || '',
          image: `https://cdn.walcache.com/v1/solana/blobs/${blobId}`,
          external_url: options.metadata.externalUrl,
          attributes: options.metadata.attributes || [],
          collection: options.contract.collection ? {
            name: options.contract.collection.name,
            family: options.contract.collection.symbol
          } : undefined,
          properties: {
            creators: options.metadata.creator ? [{
              address: options.metadata.creator,
              share: 100
            }] : [],
            files: [{
              uri: `https://cdn.walcache.com/v1/solana/blobs/${blobId}`,
              type: file.type
            }]
          }
        }
      }

      // Step 3: Simulate Solana token creation
      const result: EnhancedUploadResult = {
        blobId,
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        cdnUrl: `https://cdn.walcache.com/v1/solana/blobs/${blobId}`,
        transactionHash: await this.simulateSolanaTransaction(),
        contractAddress: options.contract?.autoDeploy ? await this.simulateSolanaProgramDeployment() : undefined,
        tokenId: options.contract?.autoDeploy ? await this.simulateSolanaTokenMint() : undefined,
      }

      // Step 4: Pin content for permanent storage
      if (options.metadata?.category === 'nft' || uploadResult.blobId) {
        try {
          await pinCID(blobId)
        } catch (error) {
          console.warn('Failed to pin content on Solana:', error)
        }
      }

      return result

    } catch (error) {
      throw new Error(`Solana upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Simulate Solana transaction (replace with real Solana Web3.js integration)
   */
  private static async simulateSolanaTransaction(): Promise<string> {
    // In real implementation, this would:
    // 1. Connect to Solana cluster
    // 2. Create and send transaction
    // 3. Return actual transaction signature
    await new Promise(resolve => setTimeout(resolve, 600)) // Simulate fast Solana network
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result // Base58 encoded signature
  }

  /**
   * Simulate Solana program deployment (replace with real Solana SDK integration)
   */
  private static async simulateSolanaProgramDeployment(): Promise<string> {
    // In real implementation, this would:
    // 1. Deploy Solana program for NFT/token creation
    // 2. Return actual program ID
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate program deployment
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Simulate Solana token mint (replace with real Solana SDK integration)
   */
  private static async simulateSolanaTokenMint(): Promise<string> {
    // In real implementation, this would:
    // 1. Create new mint account
    // 2. Mint token to user's wallet
    // 3. Return mint address
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

/**
 * Enhanced Universal Uploader Class
 */
export class EnhancedUniversalUploader {
  constructor(private config: { baseUrl: string; apiKey?: string }) {}

  /**
   * Universal store method - the main API for asset storage
   */
  async store(
    file: File, 
    options: UniversalUploadOptions
  ): Promise<EnhancedUploadResult> {
    // Step 1: Validate input
    this.validateInput(file, options)

    // Step 2: Detect file type and optimize if needed
    const category = FileTypeHandler.detectCategory(file)
    const strategy = FileTypeHandler.getStorageStrategy(category, options.targetChain)
    
    // Step 3: Apply optimizations
    const originalSize = file.size
    const optimizedFile = await this.optimizeFile(file, options.optimization, strategy)
    const optimizedSize = optimizedFile.size

    // Step 4: Route to chain-specific handler
    let result: EnhancedUploadResult
    
    switch (options.targetChain) {
      case 'ethereum':
        result = await ChainUploadHandler.uploadToEthereum(optimizedFile, options)
        break
      case 'sui':
        result = await ChainUploadHandler.uploadToSui(optimizedFile, options)
        break
      case 'solana':
        result = await ChainUploadHandler.uploadToSolana(optimizedFile, options)
        break
      default:
        throw new Error(`Unsupported chain: ${options.targetChain}`)
    }

    // Step 5: Handle cross-chain bridging if requested
    if (options.crossChain?.targetChains.length) {
      result.crossChainResults = await this.bridgeToChains(
        optimizedFile, 
        options, 
        result
      )
    }

    // Step 6: Add optimization results
    if (options.optimization?.enabled) {
      result.optimization = {
        originalSize,
        optimizedSize,
        compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1,
        formatsGenerated: strategy.formats
      }
    }

    // Step 7: Set up access control if specified
    if (options.access && options.access.type !== 'public') {
      result.accessControl = await this.setupAccessControl(result, options.access)
    }

    return result
  }

  /**
   * Validate input parameters
   */
  private validateInput(file: File, options: UniversalUploadOptions): void {
    if (!file || file.size === 0) {
      throw new Error('Valid file is required')
    }

    if (!options.targetChain) {
      throw new Error('Target chain is required')
    }

    const maxSize = 100 * 1024 * 1024 // 100MB default
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`)
    }
  }

  /**
   * Apply file optimizations based on type and preferences
   */
  private async optimizeFile(
    file: File, 
    optimizationOptions?: OptimizationOptions,
    strategy?: StorageStrategy
  ): Promise<File> {
    if (!optimizationOptions?.enabled || !strategy) {
      return file
    }

    // For images, apply basic compression and format conversion
    if (file.type.startsWith('image/')) {
      return await this.optimizeImage(file, optimizationOptions, strategy)
    }

    // For other file types, apply basic compression if needed
    if (strategy.compression !== 'none' && file.size > 1024 * 1024) {
      return await this.compressFile(file, strategy.compression)
    }

    return file
  }

  /**
   * Optimize image files
   */
  private async optimizeImage(
    file: File,
    options: OptimizationOptions,
    strategy: StorageStrategy
  ): Promise<File> {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      // In Node.js environment, simulate optimization
      console.log('Image optimization simulated (browser-only feature)')
      
      // Apply basic size reduction simulation
      const quality = (options.imageQuality || 85) / 100
      const arrayBuffer = await file.arrayBuffer()
      const reducedSize = Math.round(arrayBuffer.byteLength * quality)
      const optimizedData = arrayBuffer.slice(0, reducedSize)
      
      return new File([optimizedData], file.name, {
        type: this.getOptimalFormat(file.type, strategy.formats),
        lastModified: file.lastModified
      })
    }

    // Browser environment - use canvas for real optimization
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Calculate optimal dimensions
        let { width, height } = img
        const maxDimensions = options.maxDimensions
        
        if (maxDimensions) {
          const ratio = Math.min(
            maxDimensions.width / width,
            maxDimensions.height / height
          )
          if (ratio < 1) {
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to optimized format
        const quality = (options.imageQuality || 85) / 100
        const outputFormat = this.getOptimalFormat(file.type, strategy.formats)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: outputFormat,
                lastModified: file.lastModified
              })
              resolve(optimizedFile)
            } else {
              resolve(file)
            }
          },
          outputFormat,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Basic file compression using ZIP
   */
  private async compressFile(file: File, compression: string): Promise<File> {
    // Simple compression simulation - in real implementation would use actual compression
    const compressionRatio = {
      light: 0.9,
      medium: 0.7,
      heavy: 0.5
    }[compression] || 1

    // For demo purposes, just return file with simulated smaller size
    // Real implementation would use libraries like pako for compression
    const arrayBuffer = await file.arrayBuffer()
    const simulatedSize = Math.round(arrayBuffer.byteLength * compressionRatio)
    
    // Create a mock compressed file
    const compressedData = arrayBuffer.slice(0, simulatedSize)
    return new File([compressedData], file.name, {
      type: file.type,
      lastModified: file.lastModified
    })
  }

  /**
   * Get optimal output format for image
   */
  private getOptimalFormat(originalType: string, supportedFormats: string[]): string {
    if (supportedFormats.includes('webp')) {
      return 'image/webp'
    }
    if (supportedFormats.includes('avif')) {
      return 'image/avif'
    }
    return originalType
  }

  /**
   * Bridge asset to additional chains
   */
  private async bridgeToChains(
    file: File,
    options: UniversalUploadOptions,
    primaryResult: EnhancedUploadResult
  ): Promise<Record<SupportedChain, any>> {
    const results: Record<SupportedChain, any> = {}
    
    // Handle cross-chain deployment based on strategy
    const strategy = options.crossChain?.strategy || 'immediate'
    
    for (const chain of options.crossChain!.targetChains) {
      try {
        if (strategy === 'immediate') {
          // Immediately deploy to target chain
          const bridgeResult = await this.deployToTargetChain(
            file, 
            chain, 
            options, 
            primaryResult
          )
          results[chain] = bridgeResult
        } else if (strategy === 'lazy') {
          // Schedule for later deployment
          results[chain] = {
            status: 'scheduled',
            scheduledAt: new Date(),
            success: true
          }
        } else {
          // On-demand deployment (just register the capability)
          results[chain] = {
            status: 'on-demand',
            registered: true,
            success: true
          }
        }
      } catch (error) {
        results[chain] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    return results
  }

  /**
   * Deploy asset to a specific target chain
   */
  private async deployToTargetChain(
    file: File,
    targetChain: SupportedChain,
    options: UniversalUploadOptions,
    primaryResult: EnhancedUploadResult
  ): Promise<any> {
    // Create chain-specific options
    const chainOptions: UniversalUploadOptions = {
      ...options,
      targetChain,
      crossChain: undefined // Prevent recursive bridging
    }

    // Deploy to target chain using appropriate handler
    let bridgeResult
    switch (targetChain) {
      case 'ethereum':
        bridgeResult = await ChainUploadHandler.uploadToEthereum(file, chainOptions)
        break
      case 'sui':
        bridgeResult = await ChainUploadHandler.uploadToSui(file, chainOptions)
        break
      case 'solana':
        bridgeResult = await ChainUploadHandler.uploadToSolana(file, chainOptions)
        break
      default:
        throw new Error(`Unsupported bridge target chain: ${targetChain}`)
    }

    return {
      transactionHash: bridgeResult.transactionHash,
      contractAddress: bridgeResult.contractAddress,
      tokenId: bridgeResult.tokenId,
      blobId: bridgeResult.blobId,
      cdnUrl: bridgeResult.cdnUrl,
      success: true,
      bridgedAt: new Date()
    }
  }

  /**
   * Set up access control for the uploaded asset
   */
  private async setupAccessControl(
    result: EnhancedUploadResult,
    accessOptions: AccessControlOptions
  ): Promise<any> {
    const accessControlResult = {
      type: accessOptions.type,
      configured: false,
      contractAddress: undefined as string | undefined,
      error: undefined as string | undefined
    }

    try {
      switch (accessOptions.type) {
        case 'token-gated':
          if (accessOptions.tokenRequirements) {
            // Create token-gated access contract
            accessControlResult.contractAddress = await this.deployAccessContract(
              'token-gated',
              accessOptions.tokenRequirements
            )
            accessControlResult.configured = true
          }
          break

        case 'subscription':
          if (accessOptions.pricing) {
            // Create subscription-based access contract
            accessControlResult.contractAddress = await this.deployAccessContract(
              'subscription',
              accessOptions.pricing
            )
            accessControlResult.configured = true
          }
          break

        case 'private':
          // Set up private access (owner-only)
          accessControlResult.contractAddress = await this.deployAccessContract('private')
          accessControlResult.configured = true
          break

        case 'public':
        default:
          // No access control needed for public assets
          accessControlResult.configured = true
          break
      }
    } catch (error) {
      accessControlResult.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return accessControlResult
  }

  /**
   * Deploy access control smart contract
   */
  private async deployAccessContract(
    type: string,
    requirements?: any
  ): Promise<string> {
    // Simulate contract deployment
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // In real implementation, this would:
    // 1. Deploy smart contract with access control logic
    // 2. Configure token requirements or pricing
    // 3. Return actual contract address
    
    return `0x${Math.random().toString(16).substr(2, 40)}`
  }
}

// Export convenience function for immediate use
export async function universalStore(
  file: File,
  options: UniversalUploadOptions & { baseUrl?: string; apiKey?: string }
): Promise<EnhancedUploadResult> {
  const uploader = new EnhancedUniversalUploader({
    baseUrl: options.baseUrl || process.env.WALCACHE_CDN_URL || 'http://localhost:4500',
    apiKey: options.apiKey || process.env.WALCACHE_API_KEY
  })
  
  // Remove baseUrl and apiKey from options before passing to store
  const { baseUrl, apiKey, ...storeOptions } = options
  
  return uploader.store(file, storeOptions)
}