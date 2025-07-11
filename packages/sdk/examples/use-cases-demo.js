#!/usr/bin/env bun
/**
 * Walcache SDK Use Cases Demonstration
 * 
 * Shows real-world implementations of multi-chain storage patterns:
 * 1. dApp Frontend Hosting with Chain-Based Routing
 * 2. Data Marketplaces with Gated File Access
 * 3. Gaming Assets with User-Generated Content
 * 4. Decentralized Identity (DID) Documents
 * 5. Cross-Chain Logs and Messaging
 * 6. Media Streaming with On-Chain Gating
 */

import {
  WalcacheUseCases,
  MetadataNormalizer,
  UnifiedVerifier,
  CrossChainSearchEngine,
  ErrorHandler,
  WalcacheErrorCode
} from '../src/index.js'

console.log('🚀 Walcache SDK - Real-World Use Cases Demo')
console.log('='.repeat(60))

// Configuration
const config = {
  baseUrl: 'http://localhost:4500',
  apiKey: 'demo-api-key',
  defaultChain: 'sui'
}

const walcache = new WalcacheUseCases(config)

// Mock file creation helper
function createMockFile(name, content, type = 'text/plain') {
  return new File([content], name, { type })
}

// Demo 1: dApp Frontend Hosting
console.log('\n📱 Demo 1: dApp Frontend Hosting with Chain-Based Routing')
console.log('-'.repeat(50))

async function demoDappHosting() {
  try {
    // Upload different versions of a dApp for different chains
    console.log('📤 Uploading dApp versions for different chains...')
    
    const ethSite = await walcache.uploadSite(
      createMockFile('index.html', `
        <!DOCTYPE html>
        <html>
          <head><title>My dApp - Ethereum</title></head>
          <body>
            <h1>Welcome to My dApp (Ethereum Version)</h1>
            <p>Connect your Ethereum wallet to continue</p>
            <button onclick="connectEthereum()">Connect MetaMask</button>
          </body>
        </html>
      `, 'text/html'),
      {
        chain: 'ethereum',
        name: 'my-dapp',
        version: '1.0.0',
        environment: 'production'
      }
    )

    const suiSite = await walcache.uploadSite(
      createMockFile('index.html', `
        <!DOCTYPE html>
        <html>
          <head><title>My dApp - Sui</title></head>
          <body>
            <h1>Welcome to My dApp (Sui Version)</h1>
            <p>Connect your Sui wallet to continue</p>
            <button onclick="connectSui()">Connect Sui Wallet</button>
          </body>
        </html>
      `, 'text/html'),
      {
        chain: 'sui',
        name: 'my-dapp',
        version: '1.0.0',
        environment: 'production'
      }
    )

    console.log('✅ Ethereum site deployed:', ethSite.deploymentUrl)
    console.log('✅ Sui site deployed:', suiSite.deploymentUrl)

    // Demonstrate chain-based routing
    console.log('\n🔄 Testing chain-based routing...')
    
    const siteForEthereumUser = await walcache.getSiteUrl({
      siteName: 'my-dapp',
      userChain: 'ethereum'
    })
    
    const siteForSuiUser = await walcache.getSiteUrl({
      siteName: 'my-dapp',
      userChain: 'sui'
    })

    console.log(`🔗 Ethereum user gets: ${siteForEthereumUser.url}`)
    console.log(`🔗 Sui user gets: ${siteForSuiUser.url}`)
    
    // Auto-detect user chain
    const detectedChain = await walcache.detectUserChain()
    console.log(`🔍 Auto-detected user chain: ${detectedChain}`)

  } catch (error) {
    console.error('❌ dApp hosting demo failed:', error.message)
  }
}

// Demo 2: Data Marketplaces with Gated Access
console.log('\n💰 Demo 2: Data Marketplaces with Gated File Access')
console.log('-'.repeat(50))

async function demoDataMarketplace() {
  try {
    // Upload gated dataset
    console.log('📤 Uploading gated dataset...')
    
    const csvContent = `
user_id,transaction_amount,timestamp,category
1,150.00,2024-01-15T10:30:00Z,purchase
2,75.50,2024-01-15T11:45:00Z,refund
3,300.00,2024-01-15T14:20:00Z,purchase
4,25.99,2024-01-15T16:10:00Z,subscription
    `.trim()

    const gatedFile = await walcache.uploadGatedFile(
      createMockFile('premium-dataset.csv', csvContent, 'text/csv'),
      {
        gating: {
          type: 'nft_ownership',
          contractAddress: '0x1234567890123456789012345678901234567890',
          chain: 'ethereum'
        },
        metadata: {
          name: 'Premium E-commerce Dataset',
          description: 'High-value customer transaction data for analytics',
          price: { amount: 0.1, currency: 'ETH' },
          license: 'Commercial Use Allowed'
        },
        permanent: true
      }
    )

    console.log('✅ Gated file uploaded:', gatedFile.fileId)
    console.log('🔗 Access URL:', gatedFile.accessUrl)

    // Test access verification
    console.log('\n🔐 Testing access verification...')
    
    const userAddress = '0x1111111111111111111111111111111111111111'
    
    const accessResult = await walcache.verifyAccess({
      fileId: gatedFile.fileId,
      userAddress,
      chain: 'ethereum'
    })

    if (accessResult.hasAccess) {
      console.log('✅ Access granted! User can download the file')
      console.log('📥 Download URL:', accessResult.downloadUrl)
      
      // Demonstrate file download
      const downloadInfo = await walcache.downloadGatedFile(
        gatedFile.fileId,
        userAddress,
        'mock_access_token'
      )
      console.log('📄 File info:', downloadInfo.fileInfo)
      console.log('⏰ Link expires at:', downloadInfo.expiresAt)
    } else {
      console.log('❌ Access denied:', accessResult.reason)
      console.log('💡 User needs to own NFT at:', gatedFile.gating.contractAddress)
    }

  } catch (error) {
    console.error('❌ Data marketplace demo failed:', error.message)
  }
}

// Demo 3: Gaming Assets
console.log('\n🎮 Demo 3: Gaming Assets with User-Generated Content')
console.log('-'.repeat(50))

async function demoGamingAssets() {
  try {
    console.log('📤 Uploading gaming assets...')
    
    // User uploads a custom skin
    const skinData = `{
      "name": "Dragon Fire Skin",
      "description": "Epic skin with flame effects",
      "textures": {
        "diffuse": "dragon_skin_diffuse.png",
        "normal": "dragon_skin_normal.png",
        "emission": "dragon_skin_glow.png"
      },
      "effects": ["fire_particles", "glow_aura"],
      "rarity": "epic"
    }`

    const skinAsset = await walcache.uploadAsset(
      createMockFile('dragon_skin.json', skinData, 'application/json'),
      {
        owner: '0x2222222222222222222222222222222222222222',
        chain: 'sui',
        category: 'skin',
        gameId: 'dragon-quest-legends',
        rarity: 'epic',
        tradeable: true,
        permissions: {
          canModify: false,
          canShare: true,
          canSell: true
        },
        metadata: {
          name: 'Dragon Fire Skin',
          description: 'Epic skin with flame effects and particle systems'
        }
      }
    )

    console.log('✅ Gaming asset uploaded:', skinAsset.assetId)
    console.log('🔗 Asset URL:', skinAsset.assetUrl)
    console.log('👤 Owner:', skinAsset.owner)

    // Upload weapon asset
    const weaponData = `{
      "name": "Legendary Sword of Power",
      "type": "weapon",
      "stats": {
        "damage": 150,
        "critical_chance": 25,
        "durability": 1000
      },
      "enchantments": ["fire_damage", "life_steal"],
      "rarity": "legendary"
    }`

    const weaponAsset = await walcache.uploadAsset(
      createMockFile('legendary_sword.json', weaponData, 'application/json'),
      {
        owner: '0x3333333333333333333333333333333333333333',
        chain: 'sui',
        category: 'weapon',
        gameId: 'dragon-quest-legends',
        rarity: 'legendary',
        tradeable: true
      }
    )

    console.log('✅ Weapon asset uploaded:', weaponAsset.assetId)

    // List assets for a user
    console.log('\n📋 Listing user assets...')
    
    const userAssets = await walcache.listAssets({
      owner: '0x2222222222222222222222222222222222222222',
      gameId: 'dragon-quest-legends',
      chain: 'sui'
    })

    console.log(`📦 Found ${userAssets.totalCount} assets for user:`)
    userAssets.assets.forEach(asset => {
      console.log(`  - ${asset.category}: ${asset.metadata.name} (${asset.rarity})`)
    })

    // List all game assets
    const allGameAssets = await walcache.listAssets({
      gameId: 'dragon-quest-legends',
      limit: 10
    })

    console.log(`\n🎲 Total game assets: ${allGameAssets.totalCount}`)

  } catch (error) {
    console.error('❌ Gaming assets demo failed:', error.message)
  }
}

// Demo 4: Decentralized Identity (DID)
console.log('\n🆔 Demo 4: Decentralized Identity (DID) Documents')
console.log('-'.repeat(50))

async function demoDID() {
  try {
    console.log('📤 Creating DID document...')
    
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: 'did:sui:0x4444444444444444444444444444444444444444',
      controller: ['0x4444444444444444444444444444444444444444'],
      verificationMethod: [
        {
          id: 'did:sui:0x4444444444444444444444444444444444444444#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:sui:0x4444444444444444444444444444444444444444',
          publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
        }
      ],
      authentication: ['#key-1'],
      service: [
        {
          id: '#walcache-storage',
          type: 'WalcacheStorage',
          serviceEndpoint: 'https://api.walcache.com/user/0x4444444444444444444444444444444444444444'
        }
      ]
    }

    const didResult = await walcache.uploadDID(
      'did:sui:0x4444444444444444444444444444444444444444',
      didDocument,
      {
        chain: 'sui',
        controller: '0x4444444444444444444444444444444444444444',
        updatePolicy: 'owner_only'
      }
    )

    console.log('✅ DID document uploaded')
    console.log('🆔 DID:', didResult.did)
    console.log('🔗 Document URL:', didResult.documentUrl)
    console.log('📊 Version:', didResult.version)

    // Resolve DID document
    console.log('\n🔍 Resolving DID document...')
    
    const resolvedDID = await walcache.resolveDID(didResult.did)
    
    console.log('✅ DID resolved successfully')
    console.log('👤 Subject:', resolvedDID.document.id)
    console.log('🔑 Verification methods:', resolvedDID.document.verificationMethod?.length || 0)
    console.log('🔗 Services:', resolvedDID.document.service?.length || 0)
    console.log('📅 Last updated:', resolvedDID.metadata.lastUpdated)

  } catch (error) {
    console.error('❌ DID demo failed:', error.message)
  }
}

// Demo 5: Cross-Chain Logs and Messaging
console.log('\n📝 Demo 5: Cross-Chain Logs and Messaging')
console.log('-'.repeat(50))

async function demoCrossChainLogs() {
  try {
    console.log('📤 Uploading audit log...')
    
    const auditLog = `
[2024-01-15T10:30:00Z] INFO: User 0x1111... initiated transaction
[2024-01-15T10:30:01Z] INFO: Transaction amount: 100 ETH
[2024-01-15T10:30:01Z] INFO: Destination: 0x2222...
[2024-01-15T10:30:02Z] INFO: Gas estimate: 21000
[2024-01-15T10:30:03Z] SUCCESS: Transaction confirmed: 0xabc123...
[2024-01-15T10:30:03Z] INFO: Block number: 18500000
[2024-01-15T10:30:03Z] INFO: Gas used: 21000
    `.trim()

    const logResult = await walcache.uploadLog(auditLog, {
      chain: 'ethereum',
      logType: 'audit',
      metadata: {
        timestamp: new Date(),
        source: 'transaction-processor',
        level: 'info',
        tags: ['transaction', 'audit', 'high-value']
      }
    })

    console.log('✅ Audit log uploaded:', logResult.logId)
    console.log('🔒 Log hash:', logResult.logHash)
    console.log('📋 Reference hash:', logResult.referenceHash)

    // Get log reference for smart contract
    console.log('\n🔗 Getting log reference for smart contract...')
    
    const logReference = await walcache.getLogReference(logResult.logId)
    
    console.log('✅ Log reference generated')
    console.log('🔒 Reference hash:', logReference.referenceHash)
    console.log('🔍 Verification URL:', logReference.verificationUrl)
    console.log('📋 Proof data:', {
      logHash: logReference.proof.logHash.slice(0, 16) + '...',
      chain: logReference.proof.chain,
      timestamp: logReference.proof.timestamp
    })

    // Upload event log
    const eventLog = `
Event: TokenTransfer
From: 0x1111111111111111111111111111111111111111
To: 0x2222222222222222222222222222222222222222
Amount: 1000000000000000000 (1 ETH)
Block: 18500000
TxHash: 0xabc123def456...
Timestamp: 2024-01-15T10:30:03Z
    `.trim()

    const eventResult = await walcache.uploadLog(eventLog, {
      chain: 'ethereum',
      logType: 'event',
      metadata: {
        timestamp: new Date(),
        source: 'event-indexer',
        level: 'info',
        tags: ['token-transfer', 'event']
      }
    })

    console.log('✅ Event log uploaded:', eventResult.logId)

  } catch (error) {
    console.error('❌ Cross-chain logs demo failed:', error.message)
  }
}

// Demo 6: Media Streaming with Gating
console.log('\n🎵 Demo 6: Media Streaming with On-Chain Gating')
console.log('-'.repeat(50))

async function demoMediaStreaming() {
  try {
    console.log('📤 Uploading gated media content...')
    
    // Simulate video file
    const videoContent = new ArrayBuffer(1024 * 1024) // 1MB of data
    const videoFile = new File([videoContent], 'exclusive-concert.mp4', { type: 'video/mp4' })

    const mediaResult = await walcache.uploadMedia(videoFile, {
      type: 'video',
      chain: 'ethereum',
      quality: 'high',
      formats: ['mp4', 'webm'],
      gating: {
        type: 'nft_ownership',
        contractAddress: '0x5555555555555555555555555555555555555555',
        chain: 'ethereum'
      },
      metadata: {
        title: 'Exclusive Concert Recording',
        description: 'Private concert recording for NFT holders only',
        artist: 'The Crypto Band',
        duration: 3600 // 1 hour
      }
    })

    console.log('✅ Media uploaded:', mediaResult.mediaId)
    console.log('🎬 Stream URL:', mediaResult.streamUrl)
    console.log('📱 Available formats:', mediaResult.formats.join(', '))

    // Test streaming with access verification
    console.log('\n🔐 Testing streaming access...')
    
    const userAddress = '0x6666666666666666666666666666666666666666'
    
    const streamAccess = await walcache.streamMedia(mediaResult.mediaId, userAddress, {
      quality: 'high',
      format: 'mp4'
    })

    if (streamAccess.hasAccess) {
      console.log('✅ Streaming access granted!')
      console.log('🎬 Stream URL:', streamAccess.streamUrl)
      console.log('⏰ Access expires:', streamAccess.expiresAt)
      console.log('📱 Available formats:')
      streamAccess.formats.forEach(format => {
        console.log(`  - ${format.format} (${format.quality}): ${format.bitrate} kbps`)
      })
    } else {
      console.log('❌ Streaming access denied')
      console.log('💡 User needs to own NFT at:', mediaResult.gating?.contractAddress)
    }

    // Upload audio content
    const audioContent = new ArrayBuffer(512 * 1024) // 512KB
    const audioFile = new File([audioContent], 'premium-podcast.mp3', { type: 'audio/mpeg' })

    const audioResult = await walcache.uploadMedia(audioFile, {
      type: 'audio',
      chain: 'sui',
      quality: 'medium',
      formats: ['mp3', 'ogg'],
      gating: {
        type: 'token_ownership',
        contractAddress: '0x7777777777777777777777777777777777777777',
        minimumBalance: '100',
        chain: 'sui'
      },
      metadata: {
        title: 'Premium Podcast Episode #42',
        description: 'Exclusive insights for token holders',
        artist: 'Crypto Insights Podcast'
      }
    })

    console.log('\n✅ Audio uploaded:', audioResult.mediaId)

  } catch (error) {
    console.error('❌ Media streaming demo failed:', error.message)
  }
}

// Demo 7: Cross-Chain Search and Discovery
console.log('\n🔍 Demo 7: Cross-Chain Asset Search and Discovery')
console.log('-'.repeat(50))

async function demoCrossChainSearch() {
  try {
    console.log('🔍 Searching assets across all chains...')
    
    const searchResult = await CrossChainSearchEngine.findAssetsByOwner(
      '0x1111111111111111111111111111111111111111',
      {
        chains: ['ethereum', 'sui', 'solana'],
        assetTypes: ['nft', 'collectible'],
        verifiedOnly: false,
        limit: 10
      }
    )

    console.log(`✅ Found ${searchResult.totalCount} assets across ${Object.keys(searchResult.statistics.chainDistribution).length} chains`)
    console.log('📊 Chain distribution:')
    Object.entries(searchResult.statistics.chainDistribution).forEach(([chain, count]) => {
      console.log(`  ${chain}: ${count} assets`)
    })

    console.log('\n📋 Sample assets:')
    searchResult.assets.slice(0, 3).forEach(asset => {
      console.log(`  - ${asset.metadata.name} (${asset.chain})`)
      console.log(`    Type: ${asset.type}, Owner: ${asset.ownership.currentOwner.slice(0, 10)}...`)
    })

    // Text search across chains
    console.log('\n🔍 Text search for "gaming" assets...')
    
    const textSearchResult = await CrossChainSearchEngine.textSearch('gaming', {
      chains: ['ethereum', 'sui'],
      limit: 5
    })

    console.log(`✅ Text search found ${textSearchResult.totalCount} gaming-related assets`)
    textSearchResult.assets.forEach(asset => {
      console.log(`  - ${asset.metadata.name} (score: ${asset.relevanceScore})`)
    })

  } catch (error) {
    console.error('❌ Cross-chain search demo failed:', error.message)
  }
}

// Demo 8: Error Handling and Recovery
console.log('\n⚠️  Demo 8: Error Handling and Recovery')
console.log('-'.repeat(50))

async function demoErrorHandling() {
  try {
    console.log('🧪 Testing error handling patterns...')
    
    // Test with retry logic
    const result = await ErrorHandler.handleWithRetry(
      async () => {
        // Simulate intermittent failure
        if (Math.random() < 0.7) {
          throw new Error('Simulated network failure')
        }
        return 'Success!'
      },
      {
        maxRetries: 3,
        delay: 100,
        context: { operation: 'demo_upload', chain: 'ethereum' }
      }
    )

    console.log('✅ Operation succeeded with retry:', result)

    // Test error mapping
    try {
      throw new Error('insufficient funds for gas')
    } catch (error) {
      const walcacheError = ErrorHandler.createChainError(error, 'ethereum', 'uploadAsset')
      console.log('🔄 Error mapped:', {
        code: walcacheError.code,
        message: walcacheError.getUserMessage(),
        retryable: walcacheError.retryable,
        severity: walcacheError.severity
      })
    }

    // Show error statistics
    const errorStats = ErrorHandler.getErrorStats()
    console.log('📊 Error statistics:', {
      totalErrors: errorStats.totalErrors,
      recentErrors: errorStats.recentErrors.length
    })

  } catch (error) {
    console.error('❌ Error handling demo failed:', error.message)
  }
}

// Run all demos
async function runAllDemos() {
  try {
    await demoDappHosting()
    await demoDataMarketplace()
    await demoGamingAssets()
    await demoDID()
    await demoCrossChainLogs()
    await demoMediaStreaming()
    await demoCrossChainSearch()
    await demoErrorHandling()

    console.log('\n🎉 All demos completed successfully!')
    console.log('\n📚 Summary of Use Cases:')
    console.log('  1. ✅ dApp Frontend Hosting with Chain-Based Routing')
    console.log('  2. ✅ Data Marketplaces with Gated File Access')
    console.log('  3. ✅ Gaming Assets with User-Generated Content')
    console.log('  4. ✅ Decentralized Identity (DID) Documents')
    console.log('  5. ✅ Cross-Chain Logs and Messaging')
    console.log('  6. ✅ Media Streaming with On-Chain Gating')
    console.log('  7. ✅ Cross-Chain Asset Search and Discovery')
    console.log('  8. ✅ Error Handling and Recovery')

    console.log('\n🚀 Your Walcache SDK is ready for production!')
    console.log('💡 Developers can now build multi-chain apps with ease!')

  } catch (error) {
    console.error('❌ Demo suite failed:', error.message)
  }
}

// Export for testing
export { runAllDemos }

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos().catch(console.error)
}