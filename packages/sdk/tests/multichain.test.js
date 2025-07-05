/**
 * Multi-chain CDN URL Unit Tests for Hackathon Demo
 *
 * 🎯 Perfect for live demonstration during presentation
 */

const {
  getWalrusCDNUrl,
  getAvailableChains,
  isSupportedChain,
  getChainEndpoint,
} = require('../dist/index.js')

describe('getWalrusCDNUrl - Multi-Chain CDN URL Generation', () => {
  const testBlobId = 'XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0'

  describe('🔗 Basic URL Generation', () => {
    test('should return Sui CDN URL by default', () => {
      const result = getWalrusCDNUrl(testBlobId)
      expect(result).toBe(
        'https://aggregator.walrus-testnet.walrus.space/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })

    test('should return Sui CDN URL when explicitly specified', () => {
      const result = getWalrusCDNUrl(testBlobId, { chain: 'sui' })
      expect(result).toBe(
        'https://aggregator.walrus-testnet.walrus.space/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })

    test('should return Ethereum CDN URL (mock)', () => {
      const result = getWalrusCDNUrl(testBlobId, { chain: 'ethereum' })
      expect(result).toBe(
        'https://eth-aggregator.walrus.space/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })

    test('should return Solana CDN URL (mock)', () => {
      const result = getWalrusCDNUrl(testBlobId, { chain: 'solana' })
      expect(result).toBe(
        'https://sol-aggregator.walrus.space/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })
  })

  describe('🛠️ Custom Endpoints', () => {
    test('should use custom endpoint when provided', () => {
      const customEndpoint = 'https://my-custom-aggregator.com'
      const result = getWalrusCDNUrl(testBlobId, { customEndpoint })
      expect(result).toBe(
        'https://my-custom-aggregator.com/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })

    test('should prioritize custom endpoint over chain selection', () => {
      const customEndpoint = 'https://priority-test.com'
      const result = getWalrusCDNUrl(testBlobId, {
        chain: 'ethereum',
        customEndpoint,
      })
      expect(result).toBe(
        'https://priority-test.com/v1/blobs/XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0',
      )
    })
  })

  describe('🚨 Error Handling', () => {
    test('should throw error for unsupported chain', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid chain
        getWalrusCDNUrl(testBlobId, { chain: 'bitcoin' })
      }).toThrow('Unsupported chain: bitcoin')
    })

    test('should throw error for undefined chain', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid chain
        getWalrusCDNUrl(testBlobId, { chain: 'aptos' })
      }).toThrow('Unsupported chain: aptos')
    })
  })

  describe('🌐 Chain Support Utilities', () => {
    test('should correctly identify supported chains', () => {
      expect(isSupportedChain('sui')).toBe(true)
      expect(isSupportedChain('ethereum')).toBe(true)
      expect(isSupportedChain('solana')).toBe(true)
      expect(isSupportedChain('bitcoin')).toBe(false)
      expect(isSupportedChain('aptos')).toBe(false)
    })

    test('should return available chains configuration', () => {
      const chains = getAvailableChains()
      expect(chains).toHaveProperty('sui')
      expect(chains).toHaveProperty('ethereum')
      expect(chains).toHaveProperty('solana')

      expect(chains.sui.status).toBe('active')
      expect(chains.ethereum.status).toBe('mock')
      expect(chains.solana.status).toBe('mock')
    })

    test('should get primary endpoint for each chain', () => {
      expect(getChainEndpoint('sui')).toBe(
        'https://aggregator.walrus-testnet.walrus.space',
      )
      expect(getChainEndpoint('ethereum')).toBe(
        'https://eth-aggregator.walrus.space',
      )
      expect(getChainEndpoint('solana')).toBe(
        'https://sol-aggregator.walrus.space',
      )
    })
  })

  describe('🎯 Hackathon Demo Scenarios', () => {
    test('NFT metadata cross-chain access', () => {
      const nftMetadataBlobId = 'metadata_blob_123'

      const suiNFT = getWalrusCDNUrl(nftMetadataBlobId, { chain: 'sui' })
      const ethNFT = getWalrusCDNUrl(nftMetadataBlobId, { chain: 'ethereum' })
      const solNFT = getWalrusCDNUrl(nftMetadataBlobId, { chain: 'solana' })

      expect(suiNFT).toContain('aggregator.walrus-testnet.walrus.space')
      expect(ethNFT).toContain('eth-aggregator.walrus.space')
      expect(solNFT).toContain('sol-aggregator.walrus.space')
      expect(suiNFT).toContain(nftMetadataBlobId)
      expect(ethNFT).toContain(nftMetadataBlobId)
      expect(solNFT).toContain(nftMetadataBlobId)
    })

    test('Game assets cross-chain deployment', () => {
      const gameAssetBlobId = 'game_texture_456'

      const urls = ['sui', 'ethereum', 'solana'].map((chain) =>
        getWalrusCDNUrl(gameAssetBlobId, { chain }),
      )

      expect(urls).toHaveLength(3)
      expect(urls.every((url) => url.includes(gameAssetBlobId))).toBe(true)
      expect(urls.every((url) => url.includes('/v1/blobs/'))).toBe(true)
    })

    test('Document storage multi-chain backup', () => {
      const documentBlobId = 'important_doc_789'

      // Primary on Sui (active)
      const primary = getWalrusCDNUrl(documentBlobId, { chain: 'sui' })

      // Backup on other chains (mock for hackathon)
      const ethBackup = getWalrusCDNUrl(documentBlobId, { chain: 'ethereum' })
      const solBackup = getWalrusCDNUrl(documentBlobId, { chain: 'solana' })

      expect(primary).toContain('walrus-testnet.walrus.space')
      expect(ethBackup).toContain('eth-aggregator.walrus.space')
      expect(solBackup).toContain('sol-aggregator.walrus.space')
    })
  })
})

// 🎯 Hackathon Demo Helper
console.log('\n🚀 Multi-Chain CDN URL Tests Ready for Hackathon Demo!')
console.log('Run: npm test or jest multichain.test.js')
console.log('\n📋 Demo Scenarios Covered:')
console.log('  ✅ Basic URL generation (Sui/Ethereum/Solana)')
console.log('  ✅ Custom endpoint support')
console.log('  ✅ Error handling for unsupported chains')
console.log('  ✅ Chain support utilities')
console.log('  ✅ Real-world use cases (NFT, Gaming, Documents)')
console.log('\n🎯 Perfect for live demonstration during presentation!')
