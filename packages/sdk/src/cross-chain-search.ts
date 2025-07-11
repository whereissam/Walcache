/**
 * Cross-Chain Asset Search and Discovery System
 * 
 * Provides unified search interface across multiple blockchains
 * for finding assets by owner, collection, attributes, and more.
 */

import type { SupportedChain } from './types.js'
import type { UnifiedNFTMetadata } from './metadata-normalizer.js'
import { MetadataNormalizer } from './metadata-normalizer.js'

/**
 * Search criteria for cross-chain asset discovery
 */
export interface SearchCriteria {
  /** Chains to search (empty array = all chains) */
  chains?: SupportedChain[]
  /** Owner wallet address */
  ownerAddress?: string
  /** Collection contract addresses */
  collections?: string[]
  /** Asset types to include */
  assetTypes?: ('nft' | 'token' | 'collectible' | 'art' | 'gaming' | 'utility')[]
  /** Attribute filters */
  attributes?: Array<{
    trait_type: string
    value: string | number
    operator?: 'equals' | 'greater_than' | 'less_than' | 'contains'
  }>
  /** Text search in name/description */
  textSearch?: string
  /** Price range (if market data available) */
  priceRange?: {
    min: number
    max: number
    currency: string
  }
  /** Verification status */
  verifiedOnly?: boolean
  /** Time range for creation/last activity */
  timeRange?: {
    from?: Date
    to?: Date
  }
  /** Sort criteria */
  sortBy?: 'created_date' | 'last_activity' | 'price' | 'rarity' | 'name'
  sortOrder?: 'asc' | 'desc'
  /** Pagination */
  limit?: number
  offset?: number
}

/**
 * Unified asset representation for search results
 */
export interface UnifiedAsset {
  /** Unique asset identifier */
  id: string
  /** Source blockchain */
  chain: SupportedChain
  /** Asset type */
  type: 'nft' | 'token' | 'collectible'
  /** Normalized metadata */
  metadata: UnifiedNFTMetadata
  /** Ownership information */
  ownership: {
    currentOwner: string
    previousOwners?: string[]
    transferCount?: number
  }
  /** Collection information */
  collection?: {
    name: string
    contractAddress: string
    verified: boolean
    floorPrice?: {
      amount: number
      currency: string
    }
    totalSupply?: number
  }
  /** Market data */
  market?: {
    lastSale?: {
      price: number
      currency: string
      date: Date
      marketplace: string
    }
    currentListings?: Array<{
      marketplace: string
      price: number
      currency: string
      url: string
    }>
    estimatedValue?: {
      amount: number
      currency: string
      confidence: number // 0-1
    }
  }
  /** Technical details */
  technical: {
    contractAddress: string
    tokenId?: string
    tokenStandard: string
    createdAt: Date
    lastActivity: Date
    transactionHash: string
  }
  /** Search relevance score */
  relevanceScore?: number
}

/**
 * Search result with pagination and statistics
 */
export interface SearchResult {
  /** Found assets */
  assets: UnifiedAsset[]
  /** Total count across all pages */
  totalCount: number
  /** Current page info */
  pagination: {
    limit: number
    offset: number
    hasNext: boolean
    hasPrevious: boolean
  }
  /** Search statistics */
  statistics: {
    chainDistribution: Record<SupportedChain, number>
    typeDistribution: Record<string, number>
    averageRelevanceScore: number
    searchDuration: number
  }
  /** Applied filters summary */
  appliedFilters: SearchCriteria
}

/**
 * Chain-specific search adapter
 */
abstract class ChainSearchAdapter {
  abstract searchByOwner(
    ownerAddress: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]>

  abstract searchByCollection(
    collectionAddress: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]>

  abstract searchByAttributes(
    attributes: SearchCriteria['attributes'],
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]>

  abstract textSearch(
    query: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]>

  abstract getChain(): SupportedChain
}

/**
 * Ethereum search adapter
 */
class EthereumSearchAdapter extends ChainSearchAdapter {
  getChain(): SupportedChain {
    return 'ethereum'
  }

  async searchByOwner(
    ownerAddress: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]> {
    // Simulate Ethereum NFT search
    await new Promise(resolve => setTimeout(resolve, 400))

    const mockAssets: UnifiedAsset[] = []
    const assetCount = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < assetCount; i++) {
      mockAssets.push(await this.createMockEthereumAsset(ownerAddress, i))
    }

    return this.applyFilters(mockAssets, criteria)
  }

  async searchByCollection(
    collectionAddress: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 300))

    const mockAssets: UnifiedAsset[] = []
    const assetCount = Math.floor(Math.random() * 10) + 3

    for (let i = 0; i < assetCount; i++) {
      mockAssets.push(await this.createMockEthereumAsset(`0x${Math.random().toString(16).substr(2, 40)}`, i, collectionAddress))
    }

    return this.applyFilters(mockAssets, criteria)
  }

  async searchByAttributes(
    attributes: SearchCriteria['attributes'],
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 350))
    // Simulate attribute-based search
    return this.applyFilters([], criteria)
  }

  async textSearch(
    query: string,
    criteria: SearchCriteria
  ): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 250))
    // Simulate text search
    return this.applyFilters([], criteria)
  }

  private async createMockEthereumAsset(owner: string, index: number, collectionAddress?: string): Promise<UnifiedAsset> {
    const tokenId = Math.floor(Math.random() * 10000).toString()
    const contractAddress = collectionAddress || `0x${Math.random().toString(16).substr(2, 40)}`

    const metadata = await MetadataNormalizer.normalizeMetadata({
      name: `Ethereum NFT #${tokenId}`,
      description: `A unique Ethereum NFT from collection ${contractAddress}`,
      image: `https://api.walcache.com/ethereum/nft/${contractAddress}/${tokenId}/image`,
      attributes: [
        { trait_type: 'Rarity', value: ['Common', 'Rare', 'Epic', 'Legendary'][Math.floor(Math.random() * 4)] },
        { trait_type: 'Level', value: Math.floor(Math.random() * 100) + 1 }
      ]
    }, 'ethereum', { contractAddress, tokenId })

    return {
      id: `ethereum:${contractAddress}:${tokenId}`,
      chain: 'ethereum',
      type: 'nft',
      metadata,
      ownership: {
        currentOwner: owner,
        transferCount: Math.floor(Math.random() * 5)
      },
      collection: {
        name: `Collection ${contractAddress.slice(-6)}`,
        contractAddress,
        verified: Math.random() > 0.5,
        floorPrice: {
          amount: Math.random() * 10,
          currency: 'ETH'
        }
      },
      technical: {
        contractAddress,
        tokenId,
        tokenStandard: 'ERC-721',
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
      }
    }
  }

  private applyFilters(assets: UnifiedAsset[], criteria: SearchCriteria): UnifiedAsset[] {
    let filtered = [...assets]

    // Apply text search filter
    if (criteria.textSearch) {
      const query = criteria.textSearch.toLowerCase()
      filtered = filtered.filter(asset =>
        asset.metadata.name.toLowerCase().includes(query) ||
        asset.metadata.description.toLowerCase().includes(query)
      )
    }

    // Apply attribute filters
    if (criteria.attributes?.length) {
      filtered = filtered.filter(asset =>
        criteria.attributes!.some(filter =>
          asset.metadata.attributes.some(attr =>
            attr.trait_type === filter.trait_type &&
            this.matchesAttributeFilter(attr.value, filter.value, filter.operator || 'equals')
          )
        )
      )
    }

    // Apply verified only filter
    if (criteria.verifiedOnly) {
      filtered = filtered.filter(asset => asset.collection?.verified)
    }

    return filtered
  }

  private matchesAttributeFilter(
    value: string | number,
    filterValue: string | number,
    operator: string
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue
      case 'greater_than':
        return Number(value) > Number(filterValue)
      case 'less_than':
        return Number(value) < Number(filterValue)
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
      default:
        return value === filterValue
    }
  }
}

/**
 * Sui search adapter
 */
class SuiSearchAdapter extends ChainSearchAdapter {
  getChain(): SupportedChain {
    return 'sui'
  }

  async searchByOwner(ownerAddress: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 200))
    // Simulate Sui object search
    const mockAssets: UnifiedAsset[] = []
    const assetCount = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < assetCount; i++) {
      mockAssets.push(await this.createMockSuiAsset(ownerAddress, i))
    }

    return mockAssets
  }

  async searchByCollection(collectionAddress: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 150))
    return []
  }

  async searchByAttributes(attributes: SearchCriteria['attributes'], criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 180))
    return []
  }

  async textSearch(query: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 120))
    return []
  }

  private async createMockSuiAsset(owner: string, index: number): Promise<UnifiedAsset> {
    const objectId = `0x${Math.random().toString(16).substr(2, 64)}`

    const metadata = await MetadataNormalizer.normalizeMetadata({
      name: `Sui Object #${index + 1}`,
      description: `A unique Sui object`,
      url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${objectId}`,
      properties: {
        'Type': 'Gaming Asset',
        'Power': Math.floor(Math.random() * 100) + 1
      }
    }, 'sui', { creator: owner })

    return {
      id: `sui:${objectId}`,
      chain: 'sui',
      type: 'nft',
      metadata,
      ownership: {
        currentOwner: owner
      },
      technical: {
        contractAddress: objectId,
        tokenStandard: 'Sui Object',
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
      }
    }
  }
}

/**
 * Solana search adapter
 */
class SolanaSearchAdapter extends ChainSearchAdapter {
  getChain(): SupportedChain {
    return 'solana'
  }

  async searchByOwner(ownerAddress: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 150))
    // Simulate Solana NFT search
    const mockAssets: UnifiedAsset[] = []
    const assetCount = Math.floor(Math.random() * 4) + 1

    for (let i = 0; i < assetCount; i++) {
      mockAssets.push(await this.createMockSolanaAsset(ownerAddress, i))
    }

    return mockAssets
  }

  async searchByCollection(collectionAddress: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 100))
    return []
  }

  async searchByAttributes(attributes: SearchCriteria['attributes'], criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 120))
    return []
  }

  async textSearch(query: string, criteria: SearchCriteria): Promise<UnifiedAsset[]> {
    await new Promise(resolve => setTimeout(resolve, 90))
    return []
  }

  private async createMockSolanaAsset(owner: string, index: number): Promise<UnifiedAsset> {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let mintAddress = ''
    for (let i = 0; i < 44; i++) {
      mintAddress += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const metadata = await MetadataNormalizer.normalizeMetadata({
      name: `Solana NFT #${index + 1}`,
      symbol: 'SOL_NFT',
      description: `A unique Solana NFT`,
      image: `https://cdn.walcache.com/solana/nft/${mintAddress}/image`,
      attributes: [
        { trait_type: 'Element', value: ['Fire', 'Water', 'Earth', 'Air'][Math.floor(Math.random() * 4)] },
        { trait_type: 'Strength', value: Math.floor(Math.random() * 50) + 1 }
      ]
    }, 'solana')

    return {
      id: `solana:${mintAddress}`,
      chain: 'solana',
      type: 'nft',
      metadata,
      ownership: {
        currentOwner: owner
      },
      technical: {
        contractAddress: mintAddress,
        tokenStandard: 'Metaplex',
        createdAt: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        transactionHash: mintAddress
      }
    }
  }
}

/**
 * Main cross-chain search engine
 */
export class CrossChainSearchEngine {
  private static adapters: Map<SupportedChain, ChainSearchAdapter> = new Map([
    ['ethereum', new EthereumSearchAdapter()],
    ['sui', new SuiSearchAdapter()],
    ['solana', new SolanaSearchAdapter()]
  ])

  /**
   * Search for assets by owner across multiple chains
   */
  static async findAssetsByOwner(
    ownerAddress: string,
    criteria: SearchCriteria = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const chains = criteria.chains?.length ? criteria.chains : ['ethereum', 'sui', 'solana']
    
    // Search across all specified chains
    const searchPromises = chains.map(async (chain) => {
      const adapter = this.adapters.get(chain)
      if (!adapter) return []
      
      try {
        return await adapter.searchByOwner(ownerAddress, criteria)
      } catch (error) {
        console.warn(`Search failed for chain ${chain}:`, error)
        return []
      }
    })

    const chainResults = await Promise.all(searchPromises)
    const allAssets = chainResults.flat()

    // Apply global filters and sorting
    const filteredAssets = this.applyGlobalFilters(allAssets, criteria)
    const sortedAssets = this.sortAssets(filteredAssets, criteria)

    // Apply pagination
    const offset = criteria.offset || 0
    const limit = criteria.limit || 50
    const paginatedAssets = sortedAssets.slice(offset, offset + limit)

    // Calculate statistics
    const statistics = this.calculateStatistics(allAssets, Date.now() - startTime)

    return {
      assets: paginatedAssets,
      totalCount: filteredAssets.length,
      pagination: {
        limit,
        offset,
        hasNext: offset + limit < filteredAssets.length,
        hasPrevious: offset > 0
      },
      statistics,
      appliedFilters: criteria
    }
  }

  /**
   * Search for assets by collection
   */
  static async findAssetsByCollection(
    collectionAddress: string,
    chain: SupportedChain,
    criteria: SearchCriteria = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const adapter = this.adapters.get(chain)
    
    if (!adapter) {
      throw new Error(`Unsupported chain: ${chain}`)
    }

    const assets = await adapter.searchByCollection(collectionAddress, criteria)
    const filteredAssets = this.applyGlobalFilters(assets, criteria)
    const sortedAssets = this.sortAssets(filteredAssets, criteria)

    const offset = criteria.offset || 0
    const limit = criteria.limit || 50
    const paginatedAssets = sortedAssets.slice(offset, offset + limit)

    return {
      assets: paginatedAssets,
      totalCount: filteredAssets.length,
      pagination: {
        limit,
        offset,
        hasNext: offset + limit < filteredAssets.length,
        hasPrevious: offset > 0
      },
      statistics: this.calculateStatistics(assets, Date.now() - startTime),
      appliedFilters: criteria
    }
  }

  /**
   * Perform text search across chains
   */
  static async textSearch(
    query: string,
    criteria: SearchCriteria = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()
    const chains = criteria.chains?.length ? criteria.chains : ['ethereum', 'sui', 'solana']
    
    const searchPromises = chains.map(async (chain) => {
      const adapter = this.adapters.get(chain)
      if (!adapter) return []
      
      try {
        return await adapter.textSearch(query, { ...criteria, textSearch: query })
      } catch (error) {
        console.warn(`Text search failed for chain ${chain}:`, error)
        return []
      }
    })

    const chainResults = await Promise.all(searchPromises)
    const allAssets = chainResults.flat()

    // Calculate relevance scores for text search
    const assetsWithRelevance = allAssets.map(asset => ({
      ...asset,
      relevanceScore: this.calculateRelevanceScore(asset, query)
    }))

    const filteredAssets = this.applyGlobalFilters(assetsWithRelevance, criteria)
    const sortedAssets = this.sortAssets(filteredAssets, { ...criteria, sortBy: 'rarity' })

    const offset = criteria.offset || 0
    const limit = criteria.limit || 50
    const paginatedAssets = sortedAssets.slice(offset, offset + limit)

    return {
      assets: paginatedAssets,
      totalCount: filteredAssets.length,
      pagination: {
        limit,
        offset,
        hasNext: offset + limit < filteredAssets.length,
        hasPrevious: offset > 0
      },
      statistics: this.calculateStatistics(assetsWithRelevance, Date.now() - startTime),
      appliedFilters: { ...criteria, textSearch: query }
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  static async advancedSearch(criteria: SearchCriteria): Promise<SearchResult> {
    const startTime = Date.now()
    const chains = criteria.chains?.length ? criteria.chains : ['ethereum', 'sui', 'solana']
    
    // Combine different search strategies
    const searchPromises = chains.map(async (chain) => {
      const adapter = this.adapters.get(chain)
      if (!adapter) return []
      
      const results: UnifiedAsset[] = []
      
      try {
        // Owner-based search
        if (criteria.ownerAddress) {
          const ownerAssets = await adapter.searchByOwner(criteria.ownerAddress, criteria)
          results.push(...ownerAssets)
        }

        // Collection-based search
        if (criteria.collections?.length) {
          for (const collection of criteria.collections) {
            const collectionAssets = await adapter.searchByCollection(collection, criteria)
            results.push(...collectionAssets)
          }
        }

        // Attribute-based search
        if (criteria.attributes?.length) {
          const attributeAssets = await adapter.searchByAttributes(criteria.attributes, criteria)
          results.push(...attributeAssets)
        }

        // Text search
        if (criteria.textSearch) {
          const textAssets = await adapter.textSearch(criteria.textSearch, criteria)
          results.push(...textAssets)
        }

        // Remove duplicates
        const uniqueAssets = results.filter((asset, index, self) =>
          index === self.findIndex(a => a.id === asset.id)
        )

        return uniqueAssets
      } catch (error) {
        console.warn(`Advanced search failed for chain ${chain}:`, error)
        return []
      }
    })

    const chainResults = await Promise.all(searchPromises)
    const allAssets = chainResults.flat()

    const filteredAssets = this.applyGlobalFilters(allAssets, criteria)
    const sortedAssets = this.sortAssets(filteredAssets, criteria)

    const offset = criteria.offset || 0
    const limit = criteria.limit || 50
    const paginatedAssets = sortedAssets.slice(offset, offset + limit)

    return {
      assets: paginatedAssets,
      totalCount: filteredAssets.length,
      pagination: {
        limit,
        offset,
        hasNext: offset + limit < filteredAssets.length,
        hasPrevious: offset > 0
      },
      statistics: this.calculateStatistics(allAssets, Date.now() - startTime),
      appliedFilters: criteria
    }
  }

  /**
   * Apply global filters to assets
   */
  private static applyGlobalFilters(assets: UnifiedAsset[], criteria: SearchCriteria): UnifiedAsset[] {
    let filtered = [...assets]

    // Price range filter
    if (criteria.priceRange) {
      filtered = filtered.filter(asset => {
        const price = asset.market?.lastSale?.price || asset.market?.estimatedValue?.amount
        return price !== undefined &&
               price >= criteria.priceRange!.min &&
               price <= criteria.priceRange!.max
      })
    }

    // Time range filter
    if (criteria.timeRange) {
      filtered = filtered.filter(asset => {
        const date = asset.technical.createdAt
        const from = criteria.timeRange!.from
        const to = criteria.timeRange!.to
        
        return (!from || date >= from) && (!to || date <= to)
      })
    }

    // Asset type filter
    if (criteria.assetTypes?.length) {
      filtered = filtered.filter(asset =>
        criteria.assetTypes!.includes(asset.type as any)
      )
    }

    return filtered
  }

  /**
   * Sort assets based on criteria
   */
  private static sortAssets(assets: UnifiedAsset[], criteria: SearchCriteria): UnifiedAsset[] {
    const sortBy = criteria.sortBy || 'created_date'
    const sortOrder = criteria.sortOrder || 'desc'

    return [...assets].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'created_date':
          comparison = a.technical.createdAt.getTime() - b.technical.createdAt.getTime()
          break
        case 'last_activity':
          comparison = a.technical.lastActivity.getTime() - b.technical.lastActivity.getTime()
          break
        case 'price':
          const priceA = a.market?.lastSale?.price || 0
          const priceB = b.market?.lastSale?.price || 0
          comparison = priceA - priceB
          break
        case 'name':
          comparison = a.metadata.name.localeCompare(b.metadata.name)
          break
        case 'rarity':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  /**
   * Calculate relevance score for text search
   */
  private static calculateRelevanceScore(asset: UnifiedAsset, query: string): number {
    const lowerQuery = query.toLowerCase()
    let score = 0

    // Name match (highest weight)
    if (asset.metadata.name.toLowerCase().includes(lowerQuery)) {
      score += 100
      if (asset.metadata.name.toLowerCase() === lowerQuery) score += 50
    }

    // Description match
    if (asset.metadata.description.toLowerCase().includes(lowerQuery)) {
      score += 30
    }

    // Attribute match
    asset.metadata.attributes.forEach(attr => {
      if (attr.trait_type.toLowerCase().includes(lowerQuery) ||
          String(attr.value).toLowerCase().includes(lowerQuery)) {
        score += 20
      }
    })

    // Collection name match
    if (asset.collection?.name.toLowerCase().includes(lowerQuery)) {
      score += 40
    }

    return score
  }

  /**
   * Calculate search statistics
   */
  private static calculateStatistics(assets: UnifiedAsset[], duration: number): SearchResult['statistics'] {
    const chainDistribution: Record<SupportedChain, number> = {
      ethereum: 0,
      sui: 0,
      solana: 0
    }

    const typeDistribution: Record<string, number> = {}
    let totalRelevanceScore = 0

    assets.forEach(asset => {
      chainDistribution[asset.chain]++
      typeDistribution[asset.type] = (typeDistribution[asset.type] || 0) + 1
      totalRelevanceScore += asset.relevanceScore || 0
    })

    return {
      chainDistribution,
      typeDistribution,
      averageRelevanceScore: assets.length > 0 ? totalRelevanceScore / assets.length : 0,
      searchDuration: duration
    }
  }
}