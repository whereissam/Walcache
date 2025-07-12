# 🚀 Walcache SDK - Universal Multi-Chain Storage

**One API, All Blockchains, Zero Complexity**

The Walcache SDK provides a unified interface for asset storage across Ethereum, Sui, and Solana. Developers use it in their backends while frontends connect seamlessly to those backends.

[![npm version](https://badge.fury.io/js/@walcache%2Fsdk.svg)](https://www.npmjs.com/package/@walcache/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Why Walcache?

### **The Problem**
Multi-chain development is painful:
- ❌ Learn 3+ different blockchain APIs (Ethereum, Sui, Solana)
- ❌ Different metadata standards (ERC-721, Sui Display, Metaplex)
- ❌ Chain-specific error handling and verification
- ❌ Manual cost optimization and chain selection
- ❌ Complex NFT gating and access control

### **The Solution**
One SDK, unified experience:
- ✅ **Same API** for all blockchains
- ✅ **Automatic metadata normalization** (ERC-721 ↔ Sui Display ↔ Metaplex)
- ✅ **Unified verification** and error handling
- ✅ **Smart chain selection** based on cost, speed, compliance
- ✅ **Built-in gating** and access control
- ✅ **Cross-chain search** and asset discovery

## 🎯 Real-World Use Cases

### 1. **dApp Frontend Hosting** 📱
Deploy different site versions for different chains, with automatic user routing.

```javascript
// Upload chain-specific versions
await sdk.uploadSite('./site-eth', { chain: 'ethereum' })
await sdk.uploadSite('./site-sui', { chain: 'sui' })

// Auto-route users to their chain's version
const userChain = await sdk.detectUserChain()
const siteUrl = await sdk.getSiteUrl({ siteName: 'my-dapp', userChain })
```

### 2. **Data Marketplaces** 💰
Sell access to datasets with NFT/token gating.

```javascript
// Upload with NFT gating
await sdk.uploadGatedFile(dataset, {
  gating: { 
    type: 'nft_ownership',
    contractAddress: '0xabc...',
    chain: 'ethereum' 
  }
})

// Verify and download
if (await sdk.verifyAccess({ user: '0x123...', fileId })) {
  const file = await sdk.downloadGatedFile(fileId)
}
```

### 3. **Gaming Assets** 🎮
User-generated content with ownership and trading.

```javascript
// User uploads custom skin
await sdk.uploadAsset('./dragon-skin.png', {
  owner: '0xuser...',
  chain: 'sui',
  category: 'skin',
  gameId: 'dragon-quest',
  rarity: 'epic',
  tradeable: true
})

// List all user assets
const assets = await sdk.listAssets({ 
  owner: '0xuser...', 
  gameId: 'dragon-quest' 
})
```

### 4. **Decentralized Identity** 🆔
Store and resolve DID documents with on-chain verification.

```javascript
// Store DID document
await sdk.uploadDID('did:sui:0x123...', didDocument, { 
  chain: 'sui',
  updatePolicy: 'owner_only' 
})

// Resolve DID anywhere
const { document } = await sdk.resolveDID('did:sui:0x123...')
```

### 5. **Cross-Chain Logs** 📝
Audit trails and proofs for smart contracts.

```javascript
// Upload audit log
const logId = await sdk.uploadLog(auditData, {
  chain: 'ethereum',
  logType: 'audit'
})

// Get reference hash for smart contracts
const { referenceHash } = await sdk.getLogReference(logId)
```

### 6. **Media Streaming** 🎵
Gated content with NFT/token access control.

```javascript
// Upload gated video
await sdk.uploadMedia('./concert.mp4', {
  chain: 'ethereum',
  type: 'video',
  gating: { 
    type: 'nft_ownership',
    contractAddress: '0xabc...' 
  }
})

// Stream with verification
const stream = await sdk.streamMedia(mediaId, userAddress)
if (stream.hasAccess) {
  // User can stream the content
}
```

## 🚀 Quick Start

### Installation

```bash
npm install @walcache/sdk
# or
yarn add @walcache/sdk
# or
bun add @walcache/sdk
```

### Backend Integration

```javascript
import { WalrusCDNClient } from '@walcache/sdk'

// Initialize SDK (Stripe-style)
const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn-domain.com',
  apiKey: process.env.WCDN_API_KEY,
})

// Express.js endpoint - v1 API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // Upload file to Walrus using v1 API
    const upload = await client.createUpload(req.file, {
      vault_id: req.body.vault_id,
      parent_id: req.body.parent_id
    })
    
    // Get blob information
    const blob = await client.getBlob(upload.blob_id)
    
    res.json({
      success: true,
      upload,
      blob,
      cdnUrl: client.getCDNUrl(upload.blob_id)
    })
  } catch (error) {
    res.status(error.status || 500).json({
      error: {
        type: error.type || 'api_error',
        message: error.message,
        code: error.code
      }
    })
  }
})
```

### Frontend Integration

```javascript
// Your frontend calls YOUR backend (not directly to SDK)
const uploadAsset = async (file, chain) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('chain', chain)
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  
  return response.json()
}

// Usage
const result = await uploadAsset(selectedFile, 'ethereum')
console.log('Asset URL:', result.assetUrl)
console.log('NFT created:', result.contractAddress)
```

## 🛠 Core Features

### **Unified Metadata Normalization**
Works across all blockchain standards automatically.

```javascript
import { MetadataNormalizer } from '@walcache/sdk'

// Convert any metadata to unified format
const unified = await MetadataNormalizer.normalizeMetadata(
  rawMetadata, 
  'ethereum' // or 'sui', 'solana'
)

// Always get consistent format:
// { name, description, image, attributes, chainSpecific }
```

### **Cross-Chain Asset Verification**
Same API for all blockchains.

```javascript
import { UnifiedVerifier } from '@walcache/sdk'

// Works for any chain
const result = await UnifiedVerifier.verifyOwnership(
  userAddress,
  assetId,
  'sui', // or 'ethereum', 'solana'
  { type: 'nft_ownership' }
)

if (result.hasAccess) {
  // Grant access to premium content
}
```

### **Multi-Chain Search**
Find assets across all blockchains.

```javascript
import { CrossChainSearchEngine } from '@walcache/sdk'

// Search across all chains
const assets = await CrossChainSearchEngine.findAssetsByOwner(
  userAddress,
  {
    chains: ['ethereum', 'sui', 'solana'],
    assetTypes: ['nft', 'collectible'],
    verifiedOnly: true
  }
)

console.log(`Found ${assets.totalCount} assets across chains`)
```

### **Standardized Error Handling**
Consistent error codes across all chains.

```javascript
import { ErrorHandler, WalcacheErrorCode } from '@walcache/sdk'

try {
  await walcache.uploadAsset(file, options)
} catch (error) {
  switch (error.code) {
    case WalcacheErrorCode.INSUFFICIENT_BALANCE:
      // Handle insufficient balance (works for all chains)
      break
    case WalcacheErrorCode.NETWORK_ERROR:
      // Auto-retry with exponential backoff
      break
  }
}
```

## 🧪 Testing & Development

### **Run React Demo (Recommended)**

```bash
# Clone the repository
git clone https://github.com/your-repo/walcache-sdk
cd packages/sdk/examples/react-demo

# Start React demo
./run-react-demo.sh
# Open http://localhost:3001
```

### **Run Vanilla JS Demo**

```bash
# Alternative: Run vanilla JavaScript demo
cd packages/sdk/examples

# Start frontend demo
./run-frontend-demo.sh
# Open http://localhost:3001
```

### **Test All Use Cases**

```bash
# Run comprehensive demo
bun use-cases-demo.js

# Test specific features
bun demo-enhanced.js
```

### **Start Backend**

```bash
# Start CDN server
cd cdn-server && bun dev

# Or start production backend example
cd packages/sdk/examples
bun production-backend.js
```

## 📊 Performance & Optimization

### **Automatic Chain Selection**
SDK chooses optimal chain based on your criteria.

```javascript
// Cost optimization
const result = await walcache.uploadAsset(file, {
  strategy: 'cheapest',        // Auto-selects lowest cost chain
  maxCost: 0.001,             // Never exceed cost limit
  userPreference: 'ethereum'   // User's preferred chain
})

// Geographic compliance
const result = await walcache.uploadAsset(file, {
  strategy: 'compliant',
  userLocation: 'EU',          // GDPR compliance
  regulation: 'strict'         // Banking/finance requirements
})
```

### **File Optimization**
Automatic compression and format conversion.

```javascript
const result = await walcache.uploadAsset(file, {
  chain: 'ethereum',
  optimization: {
    enabled: true,
    imageQuality: 85,
    formats: ['webp', 'avif'],     // Generate multiple formats
    maxDimensions: { width: 1920, height: 1080 }
  }
})

// Returns optimized versions for different use cases
console.log('Optimization saved:', result.optimization.compressionRatio)
```

## 🔧 Advanced Configuration

### **Custom Verifiers**
Add your own verification logic.

```javascript
const gating = {
  type: 'custom',
  customVerifier: async (userAddress, chain) => {
    // Your custom logic here
    const hasAccess = await myCustomCheck(userAddress)
    return hasAccess
  }
}
```

### **Multi-Chain Deployment**
Deploy assets to multiple chains simultaneously.

```javascript
const result = await walcache.uploadAsset(file, {
  targetChain: 'sui',
  crossChain: {
    targetChains: ['ethereum', 'solana'],
    strategy: 'immediate',       // Deploy immediately
    syncMetadata: true          // Keep metadata in sync
  }
})

console.log('Deployed to:', Object.keys(result.crossChainResults))
```

### **Access Control**
Built-in token gating and monetization.

```javascript
const result = await walcache.uploadAsset(file, {
  chain: 'ethereum',
  access: {
    type: 'token-gated',
    tokenRequirements: {
      contractAddress: '0xabc...',
      minimumBalance: '100',
      tokenType: 'ERC20'
    },
    pricing: {
      amount: '0.1',
      currency: 'ETH',
      recurringType: 'monthly'
    }
  }
})
```

## 📚 API Reference

### **WalrusCDNClient** (v1 API)

#### Core Methods
- `getBlob(blobId)` - Get blob information and metadata
- `listBlobs(params)` - List blobs with pagination support
- `createUpload(file, options)` - Upload file to Walrus network
- `getUpload(uploadId)` - Get upload status and information
- `listUploads(params)` - List uploads with filtering and pagination

#### Cache Management
- `preloadBlobs(blobIds)` - Preload multiple blobs into cache
- `getCacheEntry(blobId)` - Get cache entry information
- `listCacheEntries(params)` - List cache entries with pagination
- `getCacheStats()` - Get cache statistics and health
- `clearCache(blobIds?)` - Clear specific or all cache entries
- `pinBlob(blobId)` - Pin blob to prevent eviction
- `unpinBlob(blobId)` - Unpin blob to allow eviction

#### Analytics & Monitoring
- `getBlobAnalytics(blobId)` - Get analytics for specific blob
- `listAnalytics(params)` - List analytics with filtering
- `getGlobalAnalytics()` - Get global CDN performance metrics
- `getPrometheusMetrics()` - Get Prometheus-format metrics

#### URL Generation
- `getCDNUrl(blobId, options)` - Generate CDN URL for blob
- `getMultiChainCDNUrl(blobId, options)` - Generate multi-chain optimized URL
- `getAdvancedCDNUrl(blobId, options)` - Generate URL with asset verification

#### Multi-Chain Support
- `verifyAsset(chain, options)` - Verify asset ownership on blockchain
- `verifyMultiChain(chains, options)` - Verify across multiple chains
- `queryAsset(chain, options)` - Query asset from smart contracts
- `getMultiChainBlobStatus(blobId, chains?)` - Check blob status across chains
- `selectOptimalNode(chain, strategy, network?)` - Select best performing node

#### Error Handling
All methods throw `WalrusCDNError` with structured error information:
```javascript
try {
  await client.getBlob('invalid-id')
} catch (error) {
  console.log(error.type)     // 'not_found_error'
  console.log(error.code)     // 'BLOB_NOT_FOUND'
  console.log(error.message)  // 'Blob not found'
  console.log(error.status)   // 404
}
```

#### Pagination
List methods support cursor-based pagination:
```javascript
const blobs = await client.listBlobs({
  limit: 10,
  starting_after: 'blob_123',
  cached: true,
  pinned: false
})

console.log(blobs.data)      // Array of BlobResource
console.log(blobs.has_more)  // Boolean
```

### **Utility Classes**

#### MetadataNormalizer
- `normalizeMetadata(raw, chain)` - Convert to unified format
- `toChainFormat(unified, chain)` - Convert to chain-specific format
- `validateMetadata(metadata)` - Check metadata quality

#### UnifiedVerifier
- `verifyOwnership(user, asset, chain, options)` - Verify ownership
- `verifyAccess(user, chain, gating)` - Check gated access
- `batchVerify(verifications)` - Verify multiple assets

#### CrossChainSearchEngine
- `findAssetsByOwner(owner, criteria)` - Search by owner
- `findAssetsByCollection(collection, chain)` - Search collection
- `textSearch(query, criteria)` - Text-based search
- `advancedSearch(criteria)` - Complex multi-criteria search

## 🔗 Links

- **Documentation**: [Full API Reference](./DEVELOPER_INTEGRATION.md)
- **Examples**: [GitHub Repository](https://github.com/your-repo/walcache-sdk)
- **Frontend Demo**: [Live Demo](https://demo.walcache.com)
- **Discord**: [Developer Community](https://discord.gg/walcache)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Ready to build the future of multi-chain applications?** 🚀

```bash
npm install @walcache/sdk
```

*Zero blockchain complexity. Maximum developer productivity.*