/**
 * Multi-Chain Testnet Verification Tests
 * 
 * This test suite focuses on Sui testnet and Ethereum Sepolia testnet
 * verification functionality for the WCDN SDK.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  WalrusCDNClient,
  getWalrusCDNUrl,
  getAdvancedWalrusCDNUrl,
  verifyAsset,
  verifyMultiChain,
  selectOptimalNode,
  EthereumVerifier,
  SuiVerifier,
  nodeManager,
  verifierRegistry,
  type AssetVerificationOptions,
  type SupportedChain,
} from '../src/index.js'

// Test configuration for Sui testnet
const SUI_TESTNET_CONFIG = {
  rpcUrl: 'https://fullnode.testnet.sui.io:443',
  userAddress: '0x1234567890abcdef1234567890abcdef12345678',
  objectId: '0xabcdef123456789012345678901234567890abcdef123456789012345678901234',
  packageId: '0x2::coin::Coin<0x2::sui::SUI>',
}

// Test configuration for Ethereum Sepolia
const ETHEREUM_SEPOLIA_CONFIG = {
  rpcUrl: 'https://sepolia.infura.io/v3/demo',
  userAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
  contractAddress: '0x1234567890123456789012345678901234567890',
  tokenId: '123',
  network: 'sepolia' as const,
}

// Test blob ID for CDN operations
const TEST_BLOB_ID = 'bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw'

describe('Multi-Chain Testnet Verification', () => {
  let client: WalrusCDNClient

  beforeEach(() => {
    client = new WalrusCDNClient({
      baseUrl: 'https://test-cdn.walrus.space',
      timeout: 30000,
    })
  })

  afterEach(() => {
    // Clean up any cached data
    nodeManager.clearLatencyCache()
  })

  describe('Sui Testnet Verification', () => {
    it('should create SuiVerifier with testnet configuration', () => {
      const verifier = new SuiVerifier(SUI_TESTNET_CONFIG.rpcUrl)
      
      expect(verifier.chain).toBe('sui')
      expect(verifier.isConfigured()).toBe(true)
    })

    it('should verify Sui object ownership on testnet', async () => {
      const verifier = new SuiVerifier(SUI_TESTNET_CONFIG.rpcUrl)
      
      const verificationOptions: AssetVerificationOptions = {
        userAddress: SUI_TESTNET_CONFIG.userAddress,
        assetId: SUI_TESTNET_CONFIG.objectId,
        metadata: {
          network: 'testnet',
          description: 'Sui testnet object verification',
        },
      }

      const result = await verifier.verifyAsset(verificationOptions)
      
      expect(result).toBeDefined()
      expect(result.chain).toBe('sui')
      expect(result.verifiedAt).toBeInstanceOf(Date)
      expect(typeof result.hasAccess).toBe('boolean')
      
      if (result.hasAccess) {
        expect(result.assetMetadata).toBeDefined()
        expect(result.assetMetadata?.name).toContain('Sui NFT')
        expect(result.assetMetadata?.description).toContain('Verified Sui object')
      }
    })

    it('should query Sui asset information on testnet', async () => {
      const verifier = new SuiVerifier(SUI_TESTNET_CONFIG.rpcUrl)
      
      const queryOptions = {
        assetId: SUI_TESTNET_CONFIG.objectId,
        contractAddress: SUI_TESTNET_CONFIG.packageId,
        chain: 'sui' as SupportedChain,
      }

      const result = await verifier.queryAsset(queryOptions)
      
      expect(result).toBeDefined()
      expect(result.queriedAt).toBeInstanceOf(Date)
      expect(typeof result.exists).toBe('boolean')
      
      if (result.exists) {
        expect(result.metadata).toBeDefined()
        expect(result.contentHashes).toBeDefined()
        expect(result.contentHashes).toContain(`walrus_${SUI_TESTNET_CONFIG.objectId}`)
      }
    })

    it('should select optimal Sui testnet node', async () => {
      const result = await selectOptimalNode('sui', 'fastest', 'testnet')
      
      expect(result).toBeDefined()
      expect(result.node).toBeDefined()
      expect(result.node.network).toBe('testnet')
      expect(result.node.url).toContain('testnet.sui.io')
      expect(result.strategy).toBe('fastest')
      expect(result.reason).toBeDefined()
    })

    it('should generate Sui testnet CDN URL', () => {
      const url = getWalrusCDNUrl(TEST_BLOB_ID, {
        chain: 'sui',
        params: { network: 'testnet' },
      })
      
      expect(url).toBeDefined()
      expect(url).toContain(TEST_BLOB_ID)
      expect(url).toContain('aggregator.walrus-testnet.walrus.space')
    })
  })

  describe('Ethereum Sepolia Verification', () => {
    it('should create EthereumVerifier with Sepolia configuration', () => {
      const verifier = new EthereumVerifier(
        ETHEREUM_SEPOLIA_CONFIG.rpcUrl,
        ETHEREUM_SEPOLIA_CONFIG.network
      )
      
      expect(verifier.chain).toBe('ethereum')
      expect(verifier.isConfigured()).toBe(true)
    })

    it('should verify ERC-721 token ownership on Sepolia', async () => {
      const verifier = new EthereumVerifier(
        ETHEREUM_SEPOLIA_CONFIG.rpcUrl,
        ETHEREUM_SEPOLIA_CONFIG.network
      )
      
      const verificationOptions: AssetVerificationOptions = {
        userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
        assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
        contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
        metadata: {
          network: 'sepolia',
          description: 'ERC-721 token on Sepolia testnet',
        },
      }

      const result = await verifier.verifyAsset(verificationOptions)
      
      expect(result).toBeDefined()
      expect(result.chain).toBe('ethereum')
      expect(result.verifiedAt).toBeInstanceOf(Date)
      expect(typeof result.hasAccess).toBe('boolean')
      
      if (result.hasAccess) {
        expect(result.assetMetadata).toBeDefined()
        expect(result.assetMetadata?.name).toContain('Ethereum NFT')
        expect(result.assetMetadata?.description).toContain('sepolia')
        expect(result.assetMetadata?.attributes).toBeDefined()
        
        const networkAttribute = result.assetMetadata?.attributes?.find(
          attr => attr.trait_type === 'Network'
        )
        expect(networkAttribute?.value).toBe('sepolia')
      }
    })

    it('should query ERC-721 token information on Sepolia', async () => {
      const verifier = new EthereumVerifier(
        ETHEREUM_SEPOLIA_CONFIG.rpcUrl,
        ETHEREUM_SEPOLIA_CONFIG.network
      )
      
      const queryOptions = {
        assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
        contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
        chain: 'ethereum' as SupportedChain,
      }

      const result = await verifier.queryAsset(queryOptions)
      
      expect(result).toBeDefined()
      expect(result.queriedAt).toBeInstanceOf(Date)
      expect(typeof result.exists).toBe('boolean')
      
      if (result.exists) {
        expect(result.metadata).toBeDefined()
        expect(result.metadata?.network).toBe('sepolia')
        expect(result.contentHashes).toBeDefined()
        expect(result.contentHashes).toContain(`ipfs_${ETHEREUM_SEPOLIA_CONFIG.tokenId}`)
        expect(result.contentHashes).toContain(`walrus_${ETHEREUM_SEPOLIA_CONFIG.tokenId}`)
      }
    })

    it('should select optimal Ethereum Sepolia node', async () => {
      const result = await selectOptimalNode('ethereum', 'fastest', 'testnet')
      
      expect(result).toBeDefined()
      expect(result.node).toBeDefined()
      expect(result.node.network).toBe('testnet')
      expect(result.node.url).toContain('sepolia')
      expect(result.strategy).toBe('fastest')
      expect(result.reason).toBeDefined()
    })

    it('should generate Ethereum CDN URL for Sepolia', () => {
      const url = getWalrusCDNUrl(TEST_BLOB_ID, {
        chain: 'ethereum',
        params: { network: 'sepolia' },
      })
      
      expect(url).toBeDefined()
      expect(url).toContain(TEST_BLOB_ID)
      expect(url).toContain('eth-aggregator.walrus.space')
    })
  })

  describe('Cross-Chain Testnet Verification', () => {
    it('should verify assets across Sui testnet and Ethereum Sepolia', async () => {
      const chains: SupportedChain[] = ['sui', 'ethereum']
      
      const verificationOptions: AssetVerificationOptions = {
        userAddress: '0x1234567890abcdef1234567890abcdef12345678',
        assetId: '12345',
        contractAddress: '0x1234567890123456789012345678901234567890',
        metadata: {
          description: 'Cross-chain testnet verification',
          networks: ['sui-testnet', 'ethereum-sepolia'],
        },
      }

      const result = await client.verifyMultiChain(chains, verificationOptions)
      
      expect(result).toBeDefined()
      expect(result.primary).toBeDefined()
      expect(result.crossChain).toBeDefined()
      expect(typeof result.hasAccess).toBe('boolean')
      
      // Check individual chain results
      expect(result.crossChain.sui).toBeDefined()
      expect(result.crossChain.ethereum).toBeDefined()
      
      chains.forEach(chain => {
        const chainResult = result.crossChain[chain]
        expect(chainResult.chain).toBe(chain)
        expect(chainResult.verifiedAt).toBeInstanceOf(Date)
        expect(typeof chainResult.hasAccess).toBe('boolean')
      })
    })

    it('should generate advanced CDN URL with testnet verification', async () => {
      const result = await getAdvancedWalrusCDNUrl(TEST_BLOB_ID, {
        baseUrl: 'https://test-cdn.walrus.space',
        chain: 'ethereum',
        verification: {
          userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
          assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
          contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
        },
        nodeSelectionStrategy: 'fastest',
        params: { network: 'sepolia' },
      })
      
      expect(result).toBeDefined()
      expect(result.url).toBeDefined()
      expect(result.url).toContain(TEST_BLOB_ID)
      expect(result.url).toContain('chain=ethereum')
      
      if (result.verification) {
        expect(result.verification.chain).toBe('ethereum')
        expect(result.verification.verifiedAt).toBeInstanceOf(Date)
        expect(typeof result.verification.hasAccess).toBe('boolean')
      }
      
      if (result.nodeSelection) {
        expect(result.nodeSelection.strategy).toBe('fastest')
        expect(result.nodeSelection.node).toBeDefined()
        expect(result.nodeSelection.reason).toBeDefined()
      }
    })

    it('should handle verification failures gracefully', async () => {
      const invalidOptions: AssetVerificationOptions = {
        userAddress: '', // Invalid address
        assetId: '',     // Invalid asset ID
        contractAddress: '', // Invalid contract
      }

      const result = await verifyAsset('ethereum', invalidOptions)
      
      expect(result).toBeDefined()
      expect(result.hasAccess).toBe(false)
      expect(result.chain).toBe('ethereum')
      expect(result.error).toBeDefined()
      expect(result.verifiedAt).toBeInstanceOf(Date)
    })
  })

  describe('Node Health and Performance', () => {
    it('should perform health check on Sui testnet nodes', async () => {
      // This should not throw an error
      await expect(async () => {
        await client.healthCheckNodes('sui')
      }).not.toThrow()
    })

    it('should perform health check on Ethereum Sepolia nodes', async () => {
      // This should not throw an error
      await expect(async () => {
        await client.healthCheckNodes('ethereum')
      }).not.toThrow()
    })

    it('should measure latency for testnet nodes', async () => {
      const suiNodes = nodeManager.getChainNodes('sui')
      const testnetNodes = suiNodes.filter(node => node.network === 'testnet')
      
      expect(testnetNodes.length).toBeGreaterThan(0)
      
      for (const node of testnetNodes) {
        const latency = await nodeManager.measureLatency(node)
        expect(typeof latency).toBe('number')
        expect(latency).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      const shortTimeoutClient = new WalrusCDNClient({
        baseUrl: 'https://test-cdn.walrus.space',
        timeout: 1, // Very short timeout
      })

      const result = await shortTimeoutClient.verifyAsset('ethereum', {
        userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
        assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
        contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
      })

      expect(result).toBeDefined()
      expect(result.hasAccess).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle invalid chain selection', async () => {
      await expect(async () => {
        await selectOptimalNode('invalid-chain' as SupportedChain, 'fastest', 'testnet')
      }).rejects.toThrow()
    })

    it('should handle missing contract address for Ethereum', async () => {
      const result = await verifyAsset('ethereum', {
        userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
        assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
        // Missing contractAddress
      })

      expect(result).toBeDefined()
      expect(result.hasAccess).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Contract address is required')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full testnet workflow', async () => {
      console.log('🧪 Running full testnet integration test...')
      
      // Step 1: Verify on Ethereum Sepolia
      const ethResult = await verifyAsset('ethereum', {
        userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
        assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
        contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
      })
      
      expect(ethResult).toBeDefined()
      expect(ethResult.chain).toBe('ethereum')
      
      // Step 2: Verify on Sui testnet
      const suiResult = await verifyAsset('sui', {
        userAddress: SUI_TESTNET_CONFIG.userAddress,
        assetId: SUI_TESTNET_CONFIG.objectId,
      })
      
      expect(suiResult).toBeDefined()
      expect(suiResult.chain).toBe('sui')
      
      // Step 3: Generate optimized CDN URLs
      const ethUrl = getWalrusCDNUrl(TEST_BLOB_ID, {
        chain: 'ethereum',
        params: { network: 'sepolia' },
      })
      
      const suiUrl = getWalrusCDNUrl(TEST_BLOB_ID, {
        chain: 'sui',
        params: { network: 'testnet' },
      })
      
      expect(ethUrl).toBeDefined()
      expect(suiUrl).toBeDefined()
      expect(ethUrl).not.toBe(suiUrl)
      
      console.log('✅ Full testnet integration test completed!')
    })
  })
})

// Helper functions for testing
export function createTestVerificationOptions(
  chain: SupportedChain,
  overrides: Partial<AssetVerificationOptions> = {}
): AssetVerificationOptions {
  const baseOptions: Record<SupportedChain, AssetVerificationOptions> = {
    sui: {
      userAddress: SUI_TESTNET_CONFIG.userAddress,
      assetId: SUI_TESTNET_CONFIG.objectId,
    },
    ethereum: {
      userAddress: ETHEREUM_SEPOLIA_CONFIG.userAddress,
      assetId: ETHEREUM_SEPOLIA_CONFIG.tokenId,
      contractAddress: ETHEREUM_SEPOLIA_CONFIG.contractAddress,
    },
    solana: {
      userAddress: '5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf',
      assetId: 'GqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf',
    },
  }
  
  return { ...baseOptions[chain], ...overrides }
}

export {
  SUI_TESTNET_CONFIG,
  ETHEREUM_SEPOLIA_CONFIG,
  TEST_BLOB_ID,
}