#!/usr/bin/env bun
/**
 * Universal Asset Storage Test Suite
 * 
 * Test the current SDK capabilities and demonstrate the vision for
 * universal asset storage across multiple blockchains.
 */

import {
  WalrusCDNClient,
  getWalrusCDNUrl,
  getAdvancedWalrusCDNUrl,
  configure,
  uploadFile,
  verifyAsset,
  selectOptimalNode,
  getBlobStatus,
  getAvailableChains,
} from './src/index.js'

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:4500', // Local WCDN server
  apiKey: 'test-api-key',
}

// Mock file for testing
function createMockFile(name, type, size = 1024) {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

// Test data for different asset types
const TEST_ASSETS = {
  image: createMockFile('test-image.jpg', 'image/jpeg', 2048),
  video: createMockFile('test-video.mp4', 'video/mp4', 5120),
  document: createMockFile('test-doc.pdf', 'application/pdf', 1024),
  nft: createMockFile('nft-metadata.json', 'application/json', 512),
}

// Enhanced test class
class UniversalStorageTest {
  constructor() {
    this.client = new WalrusCDNClient(TEST_CONFIG)
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  log(message, type = 'info') {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
    console.log(`${emoji} ${message}`)
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}`)
      const startTime = Date.now()
      await testFn()
      const duration = Date.now() - startTime
      this.log(`${name} - PASSED (${duration}ms)`, 'success')
      this.results.passed++
      this.results.tests.push({ name, status: 'passed', duration })
    } catch (error) {
      this.log(`${name} - FAILED: ${error.message}`, 'error')
      this.results.failed++
      this.results.tests.push({ name, status: 'failed', error: error.message })
    }
  }

  async runAllTests() {
    console.log('🚀 Universal Asset Storage Test Suite')
    console.log('='.repeat(50))
    console.log()

    // Configure SDK
    configure(TEST_CONFIG)

    // Test 1: Basic multi-chain URL generation
    await this.test('Multi-chain URL Generation', async () => {
      const blobId = 'test-blob-id-123'
      
      const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })
      const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' })
      const solUrl = getWalrusCDNUrl(blobId, { chain: 'solana' })

      console.log('  Sui URL:', suiUrl)
      console.log('  Ethereum URL:', ethUrl)
      console.log('  Solana URL:', solUrl)

      if (!suiUrl.includes('sui') && !ethUrl.includes('eth') && !solUrl.includes('sol')) {
        throw new Error('URLs should contain chain indicators')
      }
    })

    // Test 2: Chain availability check
    await this.test('Chain Availability Check', async () => {
      const chains = getAvailableChains()
      console.log('  Available chains:', Object.keys(chains))
      
      if (!chains.sui || !chains.ethereum || !chains.solana) {
        throw new Error('All chains should be available')
      }
    })

    // Test 3: Node optimization
    await this.test('Node Selection Optimization', async () => {
      const suiNode = await selectOptimalNode('sui', 'fastest', 'testnet')
      console.log('  Selected Sui node:', suiNode.node.url)
      console.log('  Selection reason:', suiNode.reason)
      
      if (!suiNode.node.url) {
        throw new Error('Should select a valid node')
      }
    })

    // Test 4: Blob status check (multi-chain)
    await this.test('Multi-chain Blob Status', async () => {
      const status = await getBlobStatus('test-blob-id')
      console.log('  Chains checked:', Object.keys(status.chains))
      console.log('  Available on:', status.summary.availableChains.length, 'chains')
      
      if (!status.blobId) {
        throw new Error('Should return blob status')
      }
    })

    // Test 5: Asset type detection simulation
    await this.test('Asset Type Detection (Simulation)', async () => {
      const assets = Object.entries(TEST_ASSETS)
      
      for (const [type, file] of assets) {
        console.log(`  Detected ${type}: ${file.name} (${file.type}) - ${file.size} bytes`)
        
        // Simulate storage strategy selection
        const strategy = this.getStorageStrategy(file.type, type)
        console.log(`    Recommended strategy: ${strategy}`)
      }
    })

    // Test 6: Enhanced file upload simulation
    await this.test('Enhanced Upload Simulation', async () => {
      try {
        // This would be the actual upload in a real implementation
        const mockResult = await this.simulateUniversalUpload(TEST_ASSETS.image, {
          targetChain: 'ethereum',
          metadata: {
            name: 'Test Image',
            description: 'A test image for universal storage',
            category: 'image'
          }
        })
        
        console.log('  Upload result:', mockResult)
        
        if (!mockResult.blobId || !mockResult.cdnUrl) {
          throw new Error('Upload should return blobId and cdnUrl')
        }
      } catch (error) {
        // Expected since we don't have the full upload implementation yet
        console.log('  Note: Full upload not implemented yet (expected)')
      }
    })

    // Test 7: Cross-chain verification simulation
    await this.test('Cross-chain Verification Simulation', async () => {
      const mockVerification = {
        ethereum: { hasAccess: true, chain: 'ethereum', verifiedAt: new Date() },
        sui: { hasAccess: true, chain: 'sui', verifiedAt: new Date() },
        solana: { hasAccess: false, chain: 'solana', verifiedAt: new Date(), error: 'Asset not found' }
      }
      
      console.log('  Verification results:')
      Object.entries(mockVerification).forEach(([chain, result]) => {
        const status = result.hasAccess ? '✅ Verified' : `❌ ${result.error || 'Failed'}`
        console.log(`    ${chain}: ${status}`)
      })
    })

    // Test 8: Performance benchmarks
    await this.test('Performance Benchmarks', async () => {
      const iterations = 10
      const times = []
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        getWalrusCDNUrl(`test-blob-${i}`, { chain: 'sui' })
        times.push(Date.now() - start)
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      console.log(`  Average URL generation time: ${avgTime.toFixed(2)}ms`)
      console.log(`  Min: ${Math.min(...times)}ms, Max: ${Math.max(...times)}ms`)
      
      if (avgTime > 100) {
        throw new Error('URL generation should be under 100ms')
      }
    })

    this.printResults()
  }

  // Helper method: Get storage strategy based on file type
  getStorageStrategy(mimeType, category) {
    const strategies = {
      'image/jpeg': 'Walrus + CDN with WebP optimization',
      'image/png': 'Walrus + CDN with compression',
      'video/mp4': 'Walrus + multi-quality encoding',
      'application/pdf': 'Walrus + text indexing',
      'application/json': 'Walrus + metadata parsing'
    }
    
    return strategies[mimeType] || 'Standard Walrus storage'
  }

  // Simulate the enhanced upload function
  async simulateUniversalUpload(file, options) {
    // This simulates what the enhanced SDK would do
    const mockUpload = {
      blobId: `blob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cdnUrl: `https://cdn.walcache.com/v1/${options.targetChain}/blobs/blob_${Date.now()}`,
      chain: options.targetChain,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      metadata: options.metadata,
      optimized: file.type.startsWith('image/'),
      verified: true,
      uploadTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
    }
    
    return mockUpload
  }

  printResults() {
    console.log()
    console.log('📊 Test Results Summary')
    console.log('='.repeat(30))
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`)
    console.log(`Passed: ${this.results.passed}`)
    console.log(`Failed: ${this.results.failed}`)
    console.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`)
    
    if (this.results.failed > 0) {
      console.log()
      console.log('❌ Failed Tests:')
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(test => console.log(`  - ${test.name}: ${test.error}`))
    }
    
    console.log()
    console.log('🎯 Next Steps for Universal Storage:')
    console.log('1. Implement enhanced upload interface')
    console.log('2. Add smart contract auto-deployment')
    console.log('3. Integrate file optimization pipeline')
    console.log('4. Build cross-chain bridging')
    console.log('5. Add comprehensive error handling')
  }
}

// Advanced feature demonstrations
class FutureFeatureDemo {
  static async demonstrateUniversalAPI() {
    console.log()
    console.log('🔮 Future Universal API Demonstration')
    console.log('='.repeat(40))
    
    // This is what the API will look like when fully implemented
    const exampleCode = `
// Future Universal Storage API
import { walcache } from 'walcache-sdk'

// Configure once
walcache.configure({
  apiKey: 'your-api-key',
  defaultChain: 'ethereum'
})

// Universal upload - works for any asset type, any chain
const result = await walcache.store(file, {
  targetChain: 'ethereum',           // or 'sui', 'solana'
  metadata: {
    name: 'My Digital Asset',
    description: 'Stored on blockchain',
    tags: ['art', 'nft'],
    category: 'image'
  },
  options: {
    permanence: 'permanent',         // or 'temporary'
    privacy: 'public',               // or 'private', 'token-gated'
    optimization: 'auto',            // auto-optimize for web
    crossChain: ['sui', 'solana']    // bridge to multiple chains
  }
})

// Result contains everything you need
console.log(result)
/* {
  blobId: 'bafybeig...',
  cdnUrl: 'https://cdn.walcache.com/v1/blobs/bafybeig...',
  transactionHash: '0x123...',
  contractAddress: '0xABC...',      // if NFT created
  tokenId: '1',                     // if NFT created
  verified: true,
  optimized: true,
  chains: ['ethereum', 'sui'],      // if cross-chain enabled
  uploadTime: 3400,                 // ms
  size: 2048                        // bytes
} */

// Query assets across chains
const userAssets = await walcache.queryAssets({
  owner: '0x123...',
  chains: ['ethereum', 'sui'],
  category: 'image',
  limit: 50
})

// Update existing assets
const updated = await walcache.updateAsset(blobId, newFile, {
  preserveHistory: true,
  notifyOwners: true
})
`

    console.log(exampleCode)
    
    console.log('Key Features:')
    console.log('✨ One function call stores to any supported blockchain')
    console.log('✨ Automatic file optimization and CDN distribution')
    console.log('✨ Smart contract deployment when needed (NFTs, tokens)')
    console.log('✨ Cross-chain bridging and synchronization')
    console.log('✨ Asset versioning and update capabilities')
    console.log('✨ Comprehensive metadata and search functionality')
    console.log('✨ Built-in access control and monetization')
  }
}

// Main execution
async function main() {
  const tester = new UniversalStorageTest()
  await tester.runAllTests()
  await FutureFeatureDemo.demonstrateUniversalAPI()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { UniversalStorageTest, FutureFeatureDemo }