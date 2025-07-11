/**
 * Unified Metadata Normalization System
 * 
 * Handles conversion between different blockchain NFT/asset standards:
 * - Ethereum: ERC-721/1155
 * - Sui: Display Standard
 * - Solana: Metaplex
 */

import type { SupportedChain } from './types.js'

/**
 * Unified metadata format that works across all chains
 */
export interface UnifiedNFTMetadata {
  /** Asset name */
  name: string
  /** Asset description */
  description: string
  /** Main image/asset URL */
  image: string
  /** Standardized attributes array */
  attributes: Array<{
    trait_type: string
    value: string | number
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date' | string
  }>
  /** External URL for more info */
  externalUrl?: string
  /** Animation/video URL */
  animationUrl?: string
  /** Background color (hex) */
  backgroundColor?: string
  /** YouTube URL */
  youtubeUrl?: string
  /** Raw chain-specific metadata for advanced users */
  chainSpecific: {
    chain: SupportedChain
    originalFormat: any
    contractAddress?: string
    tokenId?: string
    creator?: string
  }
}

/**
 * Ethereum ERC-721/1155 metadata format
 */
export interface ERC721Metadata {
  name: string
  description: string
  image: string
  external_url?: string
  animation_url?: string
  background_color?: string
  youtube_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>
}

/**
 * Sui Display Standard format
 */
export interface SuiDisplayMetadata {
  name: string
  description: string
  url: string
  image_url?: string
  project_url?: string
  creator?: string
  properties?: Record<string, any>
  display?: {
    name: string
    description: string
    image_url: string
    creator?: string
    project_url?: string
  }
}

/**
 * Solana Metaplex metadata format
 */
export interface MetaplexMetadata {
  name: string
  symbol: string
  description: string
  image: string
  external_url?: string
  animation_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    creators?: Array<{
      address: string
      verified: boolean
      share: number
    }>
    files?: Array<{
      uri: string
      type: string
      cdn?: boolean
    }>
    category?: string
  }
  collection?: {
    name: string
    family: string
    verified?: boolean
  }
}

/**
 * Enhanced metadata with chain context
 */
export interface EnhancedMetadata extends UnifiedNFTMetadata {
  /** Asset verification status */
  verification: {
    verified: boolean
    verifiedBy?: string
    verifiedAt?: Date
  }
  /** Collection information */
  collection?: {
    name: string
    symbol?: string
    contractAddress: string
    verified: boolean
    floorPrice?: {
      amount: number
      currency: string
    }
  }
  /** Market data */
  market?: {
    lastSale?: {
      price: number
      currency: string
      date: Date
    }
    listings?: Array<{
      marketplace: string
      price: number
      currency: string
      url: string
    }>
  }
  /** Performance metrics */
  performance?: {
    views: number
    likes: number
    shares: number
    loadTime: number
  }
}

/**
 * Metadata Normalizer - converts between chain-specific formats
 */
export class MetadataNormalizer {
  /**
   * Convert chain-specific metadata to unified format
   */
  static async normalizeMetadata(
    rawMetadata: any,
    chain: SupportedChain,
    context?: {
      contractAddress?: string
      tokenId?: string
      creator?: string
    }
  ): Promise<UnifiedNFTMetadata> {
    switch (chain) {
      case 'ethereum':
        return this.fromERC721(rawMetadata as ERC721Metadata, context)
      case 'sui':
        return this.fromSuiDisplay(rawMetadata as SuiDisplayMetadata, context)
      case 'solana':
        return this.fromMetaplex(rawMetadata as MetaplexMetadata, context)
      default:
        throw new Error(`Unsupported chain for metadata normalization: ${chain}`)
    }
  }

  /**
   * Convert unified metadata to chain-specific format
   */
  static async toChainFormat(
    metadata: UnifiedNFTMetadata,
    targetChain: SupportedChain
  ): Promise<ERC721Metadata | SuiDisplayMetadata | MetaplexMetadata> {
    switch (targetChain) {
      case 'ethereum':
        return this.toERC721(metadata)
      case 'sui':
        return this.toSuiDisplay(metadata)
      case 'solana':
        return this.toMetaplex(metadata)
      default:
        throw new Error(`Unsupported target chain: ${targetChain}`)
    }
  }

  /**
   * Convert from Ethereum ERC-721/1155 format
   */
  private static fromERC721(
    metadata: ERC721Metadata,
    context?: any
  ): UnifiedNFTMetadata {
    return {
      name: metadata.name || 'Unnamed Asset',
      description: metadata.description || '',
      image: metadata.image || '',
      attributes: metadata.attributes?.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value,
        display_type: attr.display_type
      })) || [],
      externalUrl: metadata.external_url,
      animationUrl: metadata.animation_url,
      backgroundColor: metadata.background_color,
      youtubeUrl: metadata.youtube_url,
      chainSpecific: {
        chain: 'ethereum',
        originalFormat: metadata,
        contractAddress: context?.contractAddress,
        tokenId: context?.tokenId,
        creator: context?.creator
      }
    }
  }

  /**
   * Convert from Sui Display Standard format
   */
  private static fromSuiDisplay(
    metadata: SuiDisplayMetadata,
    context?: any
  ): UnifiedNFTMetadata {
    const display = metadata.display || metadata
    
    // Convert Sui properties to attributes
    const attributes: UnifiedNFTMetadata['attributes'] = []
    if (metadata.properties) {
      Object.entries(metadata.properties).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          attributes.push({
            trait_type: key,
            value: value
          })
        }
      })
    }

    return {
      name: display.name || metadata.name || 'Unnamed Asset',
      description: display.description || metadata.description || '',
      image: display.image_url || metadata.image_url || metadata.url || '',
      attributes,
      externalUrl: display.project_url || metadata.project_url,
      chainSpecific: {
        chain: 'sui',
        originalFormat: metadata,
        creator: display.creator || metadata.creator || context?.creator
      }
    }
  }

  /**
   * Convert from Solana Metaplex format
   */
  private static fromMetaplex(
    metadata: MetaplexMetadata,
    context?: any
  ): UnifiedNFTMetadata {
    return {
      name: metadata.name || 'Unnamed Asset',
      description: metadata.description || '',
      image: metadata.image || '',
      attributes: metadata.attributes?.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value
      })) || [],
      externalUrl: metadata.external_url,
      animationUrl: metadata.animation_url,
      chainSpecific: {
        chain: 'solana',
        originalFormat: metadata,
        creator: metadata.properties?.creators?.[0]?.address || context?.creator
      }
    }
  }

  /**
   * Convert unified metadata to ERC-721 format
   */
  private static toERC721(metadata: UnifiedNFTMetadata): ERC721Metadata {
    return {
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      external_url: metadata.externalUrl,
      animation_url: metadata.animationUrl,
      background_color: metadata.backgroundColor,
      youtube_url: metadata.youtubeUrl,
      attributes: metadata.attributes.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value,
        display_type: attr.display_type
      }))
    }
  }

  /**
   * Convert unified metadata to Sui Display format
   */
  private static toSuiDisplay(metadata: UnifiedNFTMetadata): SuiDisplayMetadata {
    // Convert attributes to properties
    const properties: Record<string, any> = {}
    metadata.attributes.forEach(attr => {
      properties[attr.trait_type] = attr.value
    })

    return {
      name: metadata.name,
      description: metadata.description,
      url: metadata.image,
      image_url: metadata.image,
      project_url: metadata.externalUrl,
      creator: metadata.chainSpecific.creator,
      properties,
      display: {
        name: metadata.name,
        description: metadata.description,
        image_url: metadata.image,
        creator: metadata.chainSpecific.creator,
        project_url: metadata.externalUrl
      }
    }
  }

  /**
   * Convert unified metadata to Metaplex format
   */
  private static toMetaplex(metadata: UnifiedNFTMetadata): MetaplexMetadata {
    return {
      name: metadata.name,
      symbol: metadata.chainSpecific.originalFormat?.symbol || 'ASSET',
      description: metadata.description,
      image: metadata.image,
      external_url: metadata.externalUrl,
      animation_url: metadata.animationUrl,
      attributes: metadata.attributes.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value
      })),
      properties: {
        creators: metadata.chainSpecific.creator ? [{
          address: metadata.chainSpecific.creator,
          verified: false,
          share: 100
        }] : [],
        files: [{
          uri: metadata.image,
          type: this.detectMimeType(metadata.image)
        }],
        category: 'image'
      }
    }
  }

  /**
   * Detect MIME type from URL
   */
  private static detectMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav'
    }
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }

  /**
   * Validate metadata completeness and quality
   */
  static validateMetadata(metadata: UnifiedNFTMetadata): {
    isValid: boolean
    issues: string[]
    score: number // 0-100 quality score
  } {
    const issues: string[] = []
    let score = 100

    // Required fields
    if (!metadata.name || metadata.name.trim().length === 0) {
      issues.push('Missing or empty name')
      score -= 25
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      issues.push('Missing or empty description')
      score -= 15
    }

    if (!metadata.image || metadata.image.trim().length === 0) {
      issues.push('Missing or empty image URL')
      score -= 30
    }

    // Quality checks
    if (metadata.name && metadata.name.length < 3) {
      issues.push('Name too short (recommended: 3+ characters)')
      score -= 10
    }

    if (metadata.description && metadata.description.length < 10) {
      issues.push('Description too short (recommended: 10+ characters)')
      score -= 10
    }

    if (metadata.attributes.length === 0) {
      issues.push('No attributes provided (recommended for discoverability)')
      score -= 10
    }

    // URL validation
    if (metadata.image && !this.isValidUrl(metadata.image)) {
      issues.push('Invalid image URL format')
      score -= 20
    }

    if (metadata.externalUrl && !this.isValidUrl(metadata.externalUrl)) {
      issues.push('Invalid external URL format')
      score -= 5
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    }
  }

  /**
   * Basic URL validation
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Metadata enhancement utilities
 */
export class MetadataEnhancer {
  /**
   * Enhance metadata with additional context and market data
   */
  static async enhanceMetadata(
    metadata: UnifiedNFTMetadata,
    options: {
      includeMarketData?: boolean
      includeVerification?: boolean
      includePerformance?: boolean
    } = {}
  ): Promise<EnhancedMetadata> {
    const enhanced: EnhancedMetadata = {
      ...metadata,
      verification: {
        verified: false
      }
    }

    // Add market data if requested
    if (options.includeMarketData) {
      enhanced.market = await this.fetchMarketData(metadata)
    }

    // Add verification status if requested
    if (options.includeVerification) {
      enhanced.verification = await this.checkVerificationStatus(metadata)
    }

    // Add performance metrics if requested
    if (options.includePerformance) {
      enhanced.performance = await this.getPerformanceMetrics(metadata)
    }

    return enhanced
  }

  /**
   * Fetch market data (mock implementation)
   */
  private static async fetchMarketData(metadata: UnifiedNFTMetadata): Promise<EnhancedMetadata['market']> {
    // In real implementation, this would call marketplace APIs
    return {
      lastSale: {
        price: Math.random() * 10,
        currency: 'ETH',
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    }
  }

  /**
   * Check verification status (mock implementation)
   */
  private static async checkVerificationStatus(metadata: UnifiedNFTMetadata): Promise<EnhancedMetadata['verification']> {
    // In real implementation, this would check verification databases
    return {
      verified: Math.random() > 0.5,
      verifiedBy: 'OpenSea',
      verifiedAt: new Date()
    }
  }

  /**
   * Get performance metrics (mock implementation)
   */
  private static async getPerformanceMetrics(metadata: UnifiedNFTMetadata): Promise<EnhancedMetadata['performance']> {
    // In real implementation, this would fetch from analytics
    return {
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      loadTime: Math.random() * 2000 + 500
    }
  }
}