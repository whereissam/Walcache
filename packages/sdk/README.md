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
import { WalcacheUseCases } from '@walcache/sdk'

// Initialize SDK
const walcache = new WalcacheUseCases({
  baseUrl: 'https://your-cdn-domain.com',
  apiKey: process.env.WALCACHE_API_KEY,
  defaultChain: 'sui'
})

// Express.js endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const result = await walcache.uploadAsset(req.file, {
    chain: req.body.chain || 'sui',
    category: 'nft',
    createNFT: true,
    owner: req.body.owner
  })
  res.json(result)
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

### **WalcacheUseCases**

#### Core Methods
- `uploadAsset(file, options)` - Upload any asset to any chain
- `uploadSite(path, options)` - Deploy dApp frontend
- `uploadGatedFile(file, options)` - Upload with access control
- `uploadDID(did, document, options)` - Store DID document
- `uploadLog(content, options)` - Store audit log
- `uploadMedia(file, options)` - Upload streaming media

#### Verification & Access
- `verifyAccess(options)` - Check asset ownership
- `downloadGatedFile(fileId, user, token)` - Download protected file
- `streamMedia(mediaId, user)` - Stream protected media

#### Discovery & Search
- `listAssets(criteria)` - Find user's assets
- `getSiteUrl(options)` - Get chain-specific site URL
- `resolveDID(did)` - Resolve DID document
- `getLogReference(logId)` - Get smart contract reference

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