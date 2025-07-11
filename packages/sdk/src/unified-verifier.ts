/**
 * Unified Asset Verification System
 * 
 * Provides consistent verification interface across all supported blockchains
 * for NFT ownership, token gating, and access control.
 */

import type { SupportedChain } from './types.js'
import type { UnifiedNFTMetadata } from './metadata-normalizer.js'

/**
 * Verification options for asset ownership
 */
export interface VerificationOptions {
  /** Type of verification to perform */
  type: 'nft_ownership' | 'token_balance' | 'collection_ownership' | 'custom'
  /** Contract/collection address */
  contractAddress?: string
  /** Specific token ID (for NFT ownership) */
  tokenId?: string
  /** Minimum balance required (for token balance) */
  minimumBalance?: string
  /** Custom verification parameters */
  customParams?: Record<string, any>
  /** Cache verification result for this duration (seconds) */
  cacheDuration?: number
}

/**
 * Verification result with detailed information
 */
export interface VerificationResult {
  /** Whether user has required access */
  hasAccess: boolean
  /** Blockchain where verification was performed */
  chain: SupportedChain
  /** User's wallet address */
  userAddress: string
  /** Asset details if verification successful */
  assetDetails?: UnifiedNFTMetadata
  /** Balance information (for token verification) */
  balance?: {
    amount: string
    decimals: number
    symbol: string
  }
  /** Verification timestamp */
  verifiedAt: Date
  /** Cache expiration time */
  expiresAt?: Date
  /** Additional chain-specific data */
  chainSpecific: {
    transactionHash?: string
    blockNumber?: number
    contractData?: any
  }
  /** Error details if verification failed */
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Gating configuration for access control
 */
export interface GatingConfig {
  /** Gating type */
  type: 'nft_ownership' | 'token_balance' | 'collection_ownership' | 'multi_requirement' | 'custom'
  /** NFT collection requirements */
  nftRequirements?: {
    collections: string[] // Contract addresses
    minimumOwned?: number
    specificTokenIds?: string[]
  }
  /** Token balance requirements */
  tokenRequirements?: {
    contractAddress: string
    minimumBalance: string
    symbol?: string
  }
  /** Multiple requirements (AND/OR logic) */
  multiRequirements?: {
    logic: 'AND' | 'OR'
    requirements: GatingConfig[]
  }
  /** Custom verification function */
  customVerifier?: (userAddress: string, chain: SupportedChain) => Promise<boolean>
}

/**
 * Abstract base class for chain-specific verifiers
 */
abstract class ChainVerifier {
  abstract verifyNFTOwnership(
    userAddress: string,
    contractAddress: string,
    tokenId?: string
  ): Promise<VerificationResult>

  abstract verifyTokenBalance(
    userAddress: string,
    contractAddress: string,
    minimumBalance: string
  ): Promise<VerificationResult>

  abstract verifyCollectionOwnership(
    userAddress: string,
    contractAddress: string,
    minimumOwned?: number
  ): Promise<VerificationResult>

  abstract getChainName(): SupportedChain
}

/**
 * Ethereum-specific verifier
 */
class EthereumVerifier extends ChainVerifier {
  getChainName(): SupportedChain {
    return 'ethereum'
  }

  async verifyNFTOwnership(
    userAddress: string,
    contractAddress: string,
    tokenId?: string
  ): Promise<VerificationResult> {
    try {
      // Simulate Ethereum verification
      // In real implementation: use web3.js/ethers.js to call ownerOf()
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate network call

      const hasOwnership = Math.random() > 0.3 // 70% success rate for demo
      
      return {
        hasAccess: hasOwnership,
        chain: 'ethereum',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
          contractData: {
            contractAddress,
            tokenId,
            standard: 'ERC-721'
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'ethereum',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'ETHEREUM_VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyTokenBalance(
    userAddress: string,
    contractAddress: string,
    minimumBalance: string
  ): Promise<VerificationResult> {
    try {
      // Simulate ERC-20 balance check
      await new Promise(resolve => setTimeout(resolve, 200))

      const balance = (Math.random() * 1000).toFixed(2)
      const hasBalance = parseFloat(balance) >= parseFloat(minimumBalance)

      return {
        hasAccess: hasBalance,
        chain: 'ethereum',
        userAddress,
        balance: {
          amount: balance,
          decimals: 18,
          symbol: 'TOKEN'
        },
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            contractAddress,
            standard: 'ERC-20'
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'ethereum',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'ETHEREUM_BALANCE_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyCollectionOwnership(
    userAddress: string,
    contractAddress: string,
    minimumOwned: number = 1
  ): Promise<VerificationResult> {
    try {
      // Simulate collection ownership check
      await new Promise(resolve => setTimeout(resolve, 400))

      const ownedCount = Math.floor(Math.random() * 5)
      const hasOwnership = ownedCount >= minimumOwned

      return {
        hasAccess: hasOwnership,
        chain: 'ethereum',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            contractAddress,
            ownedCount,
            minimumRequired: minimumOwned
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'ethereum',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'ETHEREUM_COLLECTION_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }
}

/**
 * Sui-specific verifier
 */
class SuiVerifier extends ChainVerifier {
  getChainName(): SupportedChain {
    return 'sui'
  }

  async verifyNFTOwnership(
    userAddress: string,
    objectId: string
  ): Promise<VerificationResult> {
    try {
      // Simulate Sui object ownership check
      await new Promise(resolve => setTimeout(resolve, 150))

      const hasOwnership = Math.random() > 0.2 // 80% success rate for demo
      
      return {
        hasAccess: hasOwnership,
        chain: 'sui',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            objectId,
            objectType: 'sui::nft::NFT'
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'sui',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SUI_VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyTokenBalance(
    userAddress: string,
    coinType: string,
    minimumBalance: string
  ): Promise<VerificationResult> {
    try {
      // Simulate Sui coin balance check
      await new Promise(resolve => setTimeout(resolve, 100))

      const balance = (Math.random() * 500).toFixed(6)
      const hasBalance = parseFloat(balance) >= parseFloat(minimumBalance)

      return {
        hasAccess: hasBalance,
        chain: 'sui',
        userAddress,
        balance: {
          amount: balance,
          decimals: 6,
          symbol: coinType.split('::').pop() || 'SUI'
        },
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            coinType
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'sui',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SUI_BALANCE_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyCollectionOwnership(
    userAddress: string,
    collectionId: string,
    minimumOwned: number = 1
  ): Promise<VerificationResult> {
    try {
      // Simulate Sui collection ownership check
      await new Promise(resolve => setTimeout(resolve, 200))

      const ownedCount = Math.floor(Math.random() * 3)
      const hasOwnership = ownedCount >= minimumOwned

      return {
        hasAccess: hasOwnership,
        chain: 'sui',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            collectionId,
            ownedCount,
            minimumRequired: minimumOwned
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'sui',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SUI_COLLECTION_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }
}

/**
 * Solana-specific verifier
 */
class SolanaVerifier extends ChainVerifier {
  getChainName(): SupportedChain {
    return 'solana'
  }

  async verifyNFTOwnership(
    userAddress: string,
    mintAddress: string
  ): Promise<VerificationResult> {
    try {
      // Simulate Solana NFT ownership check
      await new Promise(resolve => setTimeout(resolve, 120))

      const hasOwnership = Math.random() > 0.25 // 75% success rate for demo
      
      return {
        hasAccess: hasOwnership,
        chain: 'solana',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            mintAddress,
            standard: 'Metaplex'
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'solana',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SOLANA_VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyTokenBalance(
    userAddress: string,
    mintAddress: string,
    minimumBalance: string
  ): Promise<VerificationResult> {
    try {
      // Simulate Solana token balance check
      await new Promise(resolve => setTimeout(resolve, 80))

      const balance = (Math.random() * 2000).toFixed(2)
      const hasBalance = parseFloat(balance) >= parseFloat(minimumBalance)

      return {
        hasAccess: hasBalance,
        chain: 'solana',
        userAddress,
        balance: {
          amount: balance,
          decimals: 9,
          symbol: 'SPL'
        },
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            mintAddress
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'solana',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SOLANA_BALANCE_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  async verifyCollectionOwnership(
    userAddress: string,
    collectionAddress: string,
    minimumOwned: number = 1
  ): Promise<VerificationResult> {
    try {
      // Simulate Solana collection ownership check
      await new Promise(resolve => setTimeout(resolve, 180))

      const ownedCount = Math.floor(Math.random() * 4)
      const hasOwnership = ownedCount >= minimumOwned

      return {
        hasAccess: hasOwnership,
        chain: 'solana',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {
          contractData: {
            collectionAddress,
            ownedCount,
            minimumRequired: minimumOwned
          }
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        chain: 'solana',
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'SOLANA_COLLECTION_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }
}

/**
 * Main unified verifier class
 */
export class UnifiedVerifier {
  private static verifiers: Map<SupportedChain, ChainVerifier> = new Map([
    ['ethereum', new EthereumVerifier()],
    ['sui', new SuiVerifier()],
    ['solana', new SolanaVerifier()]
  ])

  private static verificationCache: Map<string, VerificationResult> = new Map()

  /**
   * Verify asset ownership with unified interface
   */
  static async verifyOwnership(
    userAddress: string,
    assetId: string,
    chain: SupportedChain,
    options: VerificationOptions = { type: 'nft_ownership' }
  ): Promise<VerificationResult> {
    // Check cache first
    const cacheKey = `${chain}:${userAddress}:${assetId}:${options.type}`
    const cached = this.verificationCache.get(cacheKey)
    
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached
    }

    const verifier = this.verifiers.get(chain)
    if (!verifier) {
      throw new Error(`Unsupported chain for verification: ${chain}`)
    }

    let result: VerificationResult

    try {
      switch (options.type) {
        case 'nft_ownership':
          result = await verifier.verifyNFTOwnership(
            userAddress,
            options.contractAddress || assetId,
            options.tokenId
          )
          break

        case 'token_balance':
          result = await verifier.verifyTokenBalance(
            userAddress,
            options.contractAddress || assetId,
            options.minimumBalance || '1'
          )
          break

        case 'collection_ownership':
          result = await verifier.verifyCollectionOwnership(
            userAddress,
            options.contractAddress || assetId,
            parseInt(options.minimumBalance || '1')
          )
          break

        default:
          throw new Error(`Unsupported verification type: ${options.type}`)
      }

      // Set cache expiration
      if (options.cacheDuration && result.hasAccess) {
        result.expiresAt = new Date(Date.now() + options.cacheDuration * 1000)
        this.verificationCache.set(cacheKey, result)
      }

      return result

    } catch (error) {
      return {
        hasAccess: false,
        chain,
        userAddress,
        verifiedAt: new Date(),
        chainSpecific: {},
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      }
    }
  }

  /**
   * Verify access with gating configuration
   */
  static async verifyAccess(
    userAddress: string,
    chain: SupportedChain,
    gating: GatingConfig
  ): Promise<VerificationResult> {
    switch (gating.type) {
      case 'nft_ownership':
        if (!gating.nftRequirements?.collections.length) {
          throw new Error('NFT requirements not specified')
        }
        
        // Check if user owns NFT from any of the specified collections
        for (const collection of gating.nftRequirements.collections) {
          const result = await this.verifyOwnership(userAddress, collection, chain, {
            type: 'collection_ownership',
            contractAddress: collection
          })
          if (result.hasAccess) {
            return result
          }
        }
        
        return {
          hasAccess: false,
          chain,
          userAddress,
          verifiedAt: new Date(),
          chainSpecific: {},
          error: {
            code: 'NFT_OWNERSHIP_REQUIRED',
            message: 'User does not own required NFT',
            retryable: false
          }
        }

      case 'token_balance':
        if (!gating.tokenRequirements) {
          throw new Error('Token requirements not specified')
        }
        
        return this.verifyOwnership(userAddress, gating.tokenRequirements.contractAddress, chain, {
          type: 'token_balance',
          contractAddress: gating.tokenRequirements.contractAddress,
          minimumBalance: gating.tokenRequirements.minimumBalance
        })

      case 'multi_requirement':
        if (!gating.multiRequirements) {
          throw new Error('Multi requirements not specified')
        }
        
        const results = await Promise.all(
          gating.multiRequirements.requirements.map(req => 
            this.verifyAccess(userAddress, chain, req)
          )
        )
        
        const hasAccess = gating.multiRequirements.logic === 'AND'
          ? results.every(r => r.hasAccess)
          : results.some(r => r.hasAccess)
        
        return {
          hasAccess,
          chain,
          userAddress,
          verifiedAt: new Date(),
          chainSpecific: {
            multiResults: results
          }
        }

      case 'custom':
        if (!gating.customVerifier) {
          throw new Error('Custom verifier not provided')
        }
        
        const customResult = await gating.customVerifier(userAddress, chain)
        return {
          hasAccess: customResult,
          chain,
          userAddress,
          verifiedAt: new Date(),
          chainSpecific: {
            customVerification: true
          }
        }

      default:
        throw new Error(`Unsupported gating type: ${gating.type}`)
    }
  }

  /**
   * Batch verify multiple assets
   */
  static async batchVerify(
    userAddress: string,
    verifications: Array<{
      assetId: string
      chain: SupportedChain
      options?: VerificationOptions
    }>
  ): Promise<VerificationResult[]> {
    return Promise.all(
      verifications.map(({ assetId, chain, options }) =>
        this.verifyOwnership(userAddress, assetId, chain, options)
      )
    )
  }

  /**
   * Clear verification cache
   */
  static clearCache(userAddress?: string, chain?: SupportedChain): void {
    if (!userAddress && !chain) {
      this.verificationCache.clear()
      return
    }

    const keysToDelete: string[] = []
    for (const [key] of this.verificationCache) {
      const [keyChain, keyAddress] = key.split(':')
      if (
        (!chain || keyChain === chain) &&
        (!userAddress || keyAddress === userAddress)
      ) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.verificationCache.delete(key))
  }

  /**
   * Get verification cache statistics
   */
  static getCacheStats(): {
    totalEntries: number
    entriesByChain: Record<SupportedChain, number>
    oldestEntry?: Date
    newestEntry?: Date
  } {
    const stats = {
      totalEntries: this.verificationCache.size,
      entriesByChain: { ethereum: 0, sui: 0, solana: 0 } as Record<SupportedChain, number>,
      oldestEntry: undefined as Date | undefined,
      newestEntry: undefined as Date | undefined
    }

    for (const [key, result] of this.verificationCache) {
      const [chain] = key.split(':') as [SupportedChain]
      stats.entriesByChain[chain]++

      if (!stats.oldestEntry || result.verifiedAt < stats.oldestEntry) {
        stats.oldestEntry = result.verifiedAt
      }
      if (!stats.newestEntry || result.verifiedAt > stats.newestEntry) {
        stats.newestEntry = result.verifiedAt
      }
    }

    return stats
  }
}