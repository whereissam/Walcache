#!/usr/bin/env bun
/**
 * Enhanced SDK Demo
 * 
 * Demonstrates current capabilities and simulates future universal storage features
 */

import {
  WalrusCDNClient,
  getWalrusCDNUrl,
  configure,
  getBlobStatus,
  getAvailableChains,
  selectOptimalNode,
} from './src/index.js'

// Import the enhanced uploader prototype
import { universalStore, FileTypeHandler } from './src/enhanced-uploader.js'

console.log('🚀 Walcache Enhanced SDK Demo')
console.log('='.repeat(50))

// Configuration
const config = {
  baseUrl: 'http://localhost:4500',
  apiKey: 'demo-key'
}

configure(config)

// Demo 1: Current Multi-chain URL Generation
console.log('\n📡 Demo 1: Multi-chain CDN URLs')
console.log('-'.repeat(30))

const exampleBlobId = 'bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw'

// Generate URLs for different chains
const suiUrl = getWalrusCDNUrl(exampleBlobId, { chain: 'sui' })
const ethUrl = getWalrusCDNUrl(exampleBlobId, { chain: 'ethereum' })
const solUrl = getWalrusCDNUrl(exampleBlobId, { chain: 'solana' })

console.log(`Sui CDN URL:      ${suiUrl}`)
console.log(`Ethereum CDN URL: ${ethUrl}`)
console.log(`Solana CDN URL:   ${solUrl}`)

// Demo 2: Chain Information
console.log('\n🌐 Demo 2: Available Chains & Endpoints')
console.log('-'.repeat(30))

const chains = getAvailableChains()
Object.entries(chains).forEach(([chain, config]) => {
  console.log(`${chain.toUpperCase()}:`)
  console.log(`  Primary: ${config.primary}`)
  console.log(`  Status:  ${config.status}`)
  if (config.fallbacks?.length) {
    console.log(`  Fallbacks: ${config.fallbacks.length} available`)
  }
})

// Demo 3: Node Optimization
console.log('\n⚡ Demo 3: Node Selection Optimization')
console.log('-'.repeat(30))

try {
  const optimizedNode = await selectOptimalNode('sui', 'fastest', 'testnet')
  console.log('Optimal Sui Node:')
  console.log(`  URL: ${optimizedNode.node.url}`)
  console.log(`  Strategy: ${optimizedNode.strategy}`)
  console.log(`  Reason: ${optimizedNode.reason}`)
  console.log(`  Alternatives: ${optimizedNode.alternatives.length}`)
} catch (error) {
  console.log(`Node optimization demo: ${error.message}`)
}

// Demo 4: Multi-chain Blob Status
console.log('\n🔍 Demo 4: Multi-chain Blob Status')
console.log('-'.repeat(30))

try {
  const blobStatus = await getBlobStatus(exampleBlobId, ['sui', 'ethereum', 'solana'])
  console.log(`Blob ID: ${blobStatus.blobId}`)
  console.log(`Available on: ${blobStatus.summary.availableChains.join(', ')}`)
  console.log(`Total chains checked: ${blobStatus.summary.totalChains}`)
  console.log(`Best chain: ${blobStatus.summary.bestChain || 'None'}`)
  
  console.log('\nPer-chain status:')
  Object.entries(blobStatus.chains).forEach(([chain, status]) => {
    const emoji = status.exists ? '✅' : '❌'
    console.log(`  ${chain}: ${emoji} (${status.latency || 'N/A'}ms)`)
  })
} catch (error) {
  console.log(`Blob status demo: ${error.message}`)
}

// Demo 5: File Type Detection (Enhanced Feature)
console.log('\n🔍 Demo 5: File Type Detection & Strategy')
console.log('-'.repeat(30))

// Create mock files for demonstration
const mockFiles = [
  { name: 'avatar.jpg', type: 'image/jpeg', size: 2048 },
  { name: 'video.mp4', type: 'video/mp4', size: 10240 },
  { name: 'document.pdf', type: 'application/pdf', size: 1024 },
  { name: 'metadata.json', type: 'application/json', size: 512 },
  { name: 'audio.mp3', type: 'audio/mpeg', size: 5120 }
]

mockFiles.forEach(fileInfo => {
  const mockFile = new File(['mock-content'], fileInfo.name, { type: fileInfo.type })
  const category = FileTypeHandler.detectCategory(mockFile)
  
  console.log(`File: ${fileInfo.name}`)
  console.log(`  Category: ${category}`)
  console.log(`  Size: ${fileInfo.size} bytes`)
  
  // Show optimal strategy for different chains
  const chains = ['ethereum', 'sui', 'solana']
  chains.forEach(chain => {
    const strategy = FileTypeHandler.getStorageStrategy(category, chain)
    console.log(`  ${chain}: ${strategy.compression} compression, max ${(strategy.maxSize / 1024 / 1024).toFixed(1)}MB`)
  })
  console.log()
})

// Demo 6: Universal Upload Simulation (Future Feature)
console.log('\n🚀 Demo 6: Universal Upload Simulation')
console.log('-'.repeat(30))
console.log('This demonstrates the future universal upload API:')

// Simulate universal upload
const mockFile = new File(['mock image data'], 'demo-nft.jpg', { type: 'image/jpeg' })

try {
  const uploadResult = await universalStore(mockFile, {
    targetChain: 'ethereum',
    metadata: {
      name: 'Demo NFT',
      description: 'A demonstration of universal asset storage',
      tags: ['demo', 'nft', 'test'],
      category: 'nft',
      creator: '0x1234567890123456789012345678901234567890'
    },
    contract: {
      autoDeploy: true,
      contractType: 'erc721',
      collection: {
        name: 'Demo Collection',
        symbol: 'DEMO',
        maxSupply: 1000
      }
    },
    optimization: {
      enabled: true,
      imageQuality: 85,
      formats: ['webp', 'avif']
    }
  })
  
  console.log('✅ Universal Upload Simulation Result:')
  console.log(`  Blob ID: ${uploadResult.blobId}`)
  console.log(`  CDN URL: ${uploadResult.cdnUrl}`)
  console.log(`  Transaction: ${uploadResult.transactionHash}`)
  if (uploadResult.contractAddress) {
    console.log(`  Contract: ${uploadResult.contractAddress}`)
    console.log(`  Token ID: ${uploadResult.tokenId}`)
  }
} catch (error) {
  console.log(`Universal upload simulation: ${error.message}`)
}

// Demo 7: Performance Metrics
console.log('\n📊 Demo 7: Performance Benchmarks')
console.log('-'.repeat(30))

const performanceTest = () => {
  const iterations = 100
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    getWalrusCDNUrl(`test-blob-${i}`, { chain: 'sui' })
    times.push(performance.now() - start)
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  
  console.log(`URL Generation Performance (${iterations} iterations):`)
  console.log(`  Average: ${avg.toFixed(3)}ms`)
  console.log(`  Min: ${min.toFixed(3)}ms`)
  console.log(`  Max: ${max.toFixed(3)}ms`)
  console.log(`  Throughput: ${(1000 / avg).toFixed(0)} URLs/second`)
}

performanceTest()

// Summary
console.log('\n🎯 Summary & Next Steps')
console.log('='.repeat(50))
console.log('✅ Current SDK Features:')
console.log('  • Multi-chain URL generation (Sui, Ethereum, Solana)')
console.log('  • Chain endpoint configuration and fallbacks')
console.log('  • Node selection optimization')
console.log('  • Blob status checking across chains')
console.log('  • Performance optimized (sub-millisecond URL generation)')
console.log()
console.log('🚀 Enhanced Features in Development:')
console.log('  • Universal upload API (one call, any chain)')
console.log('  • Automatic file optimization and format conversion')
console.log('  • Smart contract auto-deployment')
console.log('  • Cross-chain asset bridging')
console.log('  • Access control and monetization')
console.log('  • Asset versioning and updates')
console.log()
console.log('📅 Timeline: 8-12 weeks for full implementation')
console.log('🎯 Goal: Store any asset to any chain with one function call')

console.log('\n✨ Ready to enhance your SDK! Run with: bun demo-enhanced.js')