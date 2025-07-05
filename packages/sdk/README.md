# @walrus/cdn

Official SDK for Walrus CDN - Fast, reliable access to Walrus decentralized storage with optional caching.

[![npm version](https://badge.fury.io/js/@walrus%2Fcdn.svg)](https://badge.fury.io/js/@walrus%2Fcdn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Security Notice](#security-notice)
- [Why Chain Parameters?](#why-chain-parameters-vs-simple-urls-like-imgur)
- [Complete Developer Flow](#complete-developer-flow)
- [Business Model & Monetization](#business-model--monetization)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [FAQ](#faq)
- [Examples & Templates](#examples--templates)
- [Community & Support](#community--support)
- [Contributing](#contributing)

## Installation

```bash
npm install @walrus/cdn
# or
yarn add @walrus/cdn
# or
pnpm add @walrus/cdn
```

## Quick Start

### 🚀 Option 1: Just Access Files (No Server Required)

Perfect for displaying existing Walrus content:

```typescript
import { getWalrusCDNUrl } from '@walrus/cdn';

// Direct access to any Walrus blob - works immediately
const url = getWalrusCDNUrl('sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0', {
  chain: 'sui' // or 'ethereum', 'solana'
});

// Use anywhere - React, HTML, fetch(), etc.
<img src={url} alt="My image" />
```

### ⚡ Option 2: Upload + Instant Access (With WCDN Server)

Perfect for apps that need to upload files with zero-delay access:

```typescript
import { uploadAndGetInstantUrl, getWalrusCDNUrl } from '@walrus/cdn';

// 1. Upload file + get instant cached URL
const file = document.getElementById('fileInput').files[0];
const result = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://your-wcdn-server.com'
});

// 2. URL is immediately usable with ZERO delay
<img src={result.url} /> // ⚡ Instant load - pre-cached!

// 3. Later, generate URLs from blob ID
const sameUrl = getWalrusCDNUrl(result.blobId, {
  baseUrl: 'https://your-wcdn-server.com'
});
```

### 🔧 Option 3: Advanced Usage with Client

For full control over caching, analytics, and upload management:

```typescript
import { WalrusCDNClient } from '@walrus/cdn'

const client = new WalrusCDNClient({
  baseUrl: 'https://your-wcdn-server.com',
  apiKey: 'your-api-key',
})

// Upload with full control
const uploadResult = await client.uploadFile(file, 'my-vault')

// Get cache analytics
const stats = await client.getCIDInfo(uploadResult.blobId)

// Pre-load files for instant access
await client.preloadCIDs(['blob-id-1', 'blob-id-2'])
```

## Security Notice

⚠️ **IMPORTANT: All data stored on Walrus is publicly accessible**

```typescript
// ❌ DON'T store sensitive data
await uploadAndGetInstantUrl(privateKeyFile) // Anyone can access this!
await uploadAndGetInstantUrl(personalPhotoFile) // Publicly visible!

// ✅ DO store public content
await uploadAndGetInstantUrl(nftArtFile) // Perfect for public NFTs
await uploadAndGetInstantUrl(gameAssetFile) // Great for game assets
await uploadAndGetInstantUrl(documentFile) // Good for public docs
```

**What this means:**

- 🌍 **Public by design**: All blobs are accessible via their blob ID
- 🔓 **No private storage**: Anyone with a blob ID can download the content
- 🎯 **Perfect for**: NFT art, game assets, public documents, website media
- ❌ **Never store**: Private keys, personal data, passwords, sensitive documents

For more details, see [Walrus Security Documentation](https://docs.walrus.site/security).

## Why Chain Parameters? (vs Simple URLs like Imgur)

### 🤔 **"Can't I just use one URL like Imgur?"**

**Short answer:** Yes, for simple cases! But Walrus CDN supports advanced Web3 scenarios.

```typescript
// Simple case: Just like Imgur - one URL for everyone
const simpleUrl = getWalrusCDNUrl('blob-id')
// Works for: public images, documents, basic file storage

// Advanced case: Multi-chain with smart features
const chainSpecificUrl = getWalrusCDNUrl('blob-id', { chain: 'sui' })
// Works for: NFT gated content, cross-chain assets, blockchain verification
```

### 🌍 **Web2 vs Web3 CDN Comparison**

| Feature                        | Imgur (Web2)            | Walrus CDN (Web3)                         |
| ------------------------------ | ----------------------- | ----------------------------------------- |
| **Simple URLs**                | ✅ One URL fits all     | ✅ Also works - `getWalrusCDNUrl(blobId)` |
| **Access Control**             | ❌ Public or login only | ✅ Per-chain NFT/token gating             |
| **Asset Verification**         | ❌ Trust the platform   | ✅ Blockchain-verified ownership          |
| **Cross-Chain Assets**         | ❌ Not applicable       | ✅ Sui + Ethereum + Solana in one app     |
| **Smart Contract Integration** | ❌ Separate systems     | ✅ Native blockchain integration          |

### 🔗 **Why Chain Parameters Matter**

#### **1. Asset Verification & Gating**

```typescript
// NFT-gated content: Only Sui NFT holders can access
const nftGatedUrl = getWalrusCDNUrl('premium-content', {
  chain: 'sui',
  gating: { nftCollection: '0xabc...' },
})

// Token-gated: Only Ethereum token holders
const tokenGatedUrl = getWalrusCDNUrl('exclusive-video', {
  chain: 'ethereum',
  gating: { tokenContract: '0xdef...' },
})
```

#### **2. Cross-Chain Asset Aggregation**

```typescript
// Multi-chain NFT marketplace showing assets from all chains
function CrossChainGallery() {
  return (
    <div>
      {/* Sui NFTs */}
      <img src={getWalrusCDNUrl('image1', { chain: 'sui' })} />

      {/* Ethereum NFTs */}
      <img src={getWalrusCDNUrl('image2', { chain: 'ethereum' })} />

      {/* Solana NFTs */}
      <img src={getWalrusCDNUrl('image3', { chain: 'solana' })} />
    </div>
  );
}
```

#### **3. Smart Contract Integration**

```typescript
// Different chains = different smart contract rules
const suiAsset = getWalrusCDNUrl('game-item', {
  chain: 'sui',
  // ↳ Uses Sui Move contracts for ownership verification
})

const ethAsset = getWalrusCDNUrl('collectible', {
  chain: 'ethereum',
  // ↳ Uses Ethereum Solidity contracts for access control
})
```

#### **4. Network Optimization**

```typescript
// CDN automatically routes to best endpoints per chain
const optimizedUrl = getWalrusCDNUrl('large-video', {
  chain: 'sui', // ↳ Uses Sui-optimized Walrus nodes
  // vs chain: 'ethereum' ↳ Uses Ethereum-optimized endpoints
})
```

### 🎯 **When to Use What**

```typescript
// 📷 Simple public content (like Imgur)
const publicUrl = getWalrusCDNUrl('meme.jpg')
// Perfect for: blogs, public galleries, documentation

// 🔐 Blockchain-verified content
const verifiedUrl = getWalrusCDNUrl('exclusive.mp4', { chain: 'sui' })
// Perfect for: NFT marketplaces, premium content, Web3 games

// 🌐 Cross-chain applications
const multiChainUrls = [
  getWalrusCDNUrl('asset1', { chain: 'sui' }),
  getWalrusCDNUrl('asset2', { chain: 'ethereum' }),
  getWalrusCDNUrl('asset3', { chain: 'solana' }),
]
// Perfect for: DEX aggregators, multi-chain wallets, universal NFT viewers
```

### ✨ **Best of Both Worlds**

Walrus CDN gives you **Imgur simplicity** when you want it, **Web3 superpowers** when you need them:

- **Start simple**: `getWalrusCDNUrl(blobId)` - just like Imgur
- **Add features**: Specify chain for verification, gating, optimization
- **Scale up**: Multi-chain support, smart contract integration, advanced access control

## Use Cases & Architecture

### 🎯 When to Use Each Approach

| Use Case               | Approach            | Benefits                                                                           | Requirements    |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------- | --------------- |
| **Simple file access** | `getWalrusCDNUrl()` | ✅ No server needed<br/>✅ Works immediately<br/>✅ Multi-chain support            | Just blob ID    |
| **Production app**     | Hosted WCDN service | ✅ Fast caching<br/>✅ Upload capability<br/>✅ Analytics<br/>✅ No infrastructure | API key         |
| **Enterprise/Custom**  | Your WCDN server    | ✅ Full control<br/>✅ Custom caching<br/>✅ Private network                       | Run WCDN server |

### 🏗️ Architecture Explained

```
📱 Your App
    ↓
🔧 @walrus/cdn SDK
    ↓
┌─────────────────┬─────────────────┐
│  Direct Mode    │  Cached Mode    │
│  (No server)    │  (With WCDN)    │
└─────────────────┴─────────────────┘
    ↓                     ↓
🌐 Walrus Aggregator  ⚡ WCDN Server
    ↓                     ↓
🗃️ Walrus Storage    🗃️ Walrus Storage
   (Decentralized)      (+ Fast Cache)
```

### 📖 Complete Examples

#### Example 1: NFT Gallery (No Server Required)

```typescript
import { getWalrusCDNUrl } from '@walrus/cdn';

// Your NFT metadata has Walrus blob IDs
const nftMetadata = {
  image: 'sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0',
  animation: 'fX8k2Lm_vQwE3rYtNpSdGjH9CcVbZaKl0mP7iU4eR6sT'
};

// Generate URLs for any chain
function NFTDisplay({ metadata }) {
  const imageUrl = getWalrusCDNUrl(metadata.image, { chain: 'sui' });
  const animUrl = getWalrusCDNUrl(metadata.animation, { chain: 'ethereum' });

  return (
    <div>
      <img src={imageUrl} alt="NFT" />
      <video src={animUrl} controls />
    </div>
  );
}
```

#### Example 2: Upload + Instant Access (Zero Delay)

```typescript
import { uploadAndGetInstantUrl, getWalrusCDNUrl } from '@walrus/cdn'

// 🚀 Perfect developer experience: Upload + instant cached access
async function handleFileUpload(file: File) {
  // One function call - upload + pre-cache for instant access
  const result = await uploadAndGetInstantUrl(file, {
    baseUrl: 'https://your-wcdn-server.com',
  })

  // This URL is immediately usable with ZERO delay!
  return {
    url: result.url, // ⚡ Pre-cached - instant load
    blobId: result.blobId,
    cached: true, // Guaranteed cached
  }
}

// Alternative: Separate upload + URL generation
async function traditionalFlow(file: File) {
  // Step 1: Upload with auto-cache
  const uploadResult = await uploadToWalrusWithCache(file, {
    baseUrl: 'https://your-wcdn-server.com',
    preloadCache: true, // Pre-warm cache
  })

  // Step 2: Generate URL (instant access - already cached!)
  const url = getWalrusCDNUrl(uploadResult.blobId, {
    baseUrl: 'https://your-wcdn-server.com',
  })

  return { url, blobId: uploadResult.blobId }
}
```

#### Example 3: React Component with Instant Display

```typescript
import { uploadAndGetInstantUrl } from '@walrus/cdn';

function ImageUploader() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload + get instant cached URL
      const { url } = await uploadAndGetInstantUrl(file, {
        baseUrl: 'https://your-wcdn-server.com'
      });

      setImageUrl(url); // Image loads INSTANTLY - no cache miss!
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Uploaded"
          onLoad={() => console.log('⚡ Instant load - no delay!')}
        />
      )}
    </div>
  );
}
```

## Complete Developer Flow

### 🔄 How Everything Works Together

```typescript
import { uploadAndGetInstantUrl, getWalrusCDNUrl } from '@walrus/cdn';

// 1. Developer uploads file through SDK
const file = document.getElementById('fileInput').files[0];
const result = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://your-wcdn-server.com'
});

// 2. SDK uploads to Walrus + pre-caches on WCDN server
// 3. Developer gets instant cached URL
const url = result.url; // https://your-wcdn-server.com/cdn/blob-id

// 4. OR developer can generate URLs later from blob ID
const sameUrl = getWalrusCDNUrl(result.blobId, {
  baseUrl: 'https://your-wcdn-server.com'
});

// 5. Users access files with ZERO delay (pre-cached!)
<img src={url} /> // ⚡ Instant load - no cache miss!
```

### 🏗️ Complete Architecture Flow

```
📱 Developer App
    ↓ uploadAndGetInstantUrl(file)
🔧 @walrus/cdn SDK
    ↓ POST /upload/walrus
🖥️ Your WCDN Server
    ↓ Upload to Walrus + Store in Cache
🌐 Walrus Network (decentralized storage)
    ↑ File stored permanently
⚡ Redis/Memory Cache
    ↑ File cached for fast access
    ↓
👤 End Users request: your-server.com/cdn/blob-id
    ↓ ⚡ INSTANT response (cached!)
```

## Business Model & Monetization

### 💰 Three-Tier Strategy

#### 🆓 **Free Tier: Direct Access**

```typescript
// No server required - always free
const url = getWalrusCDNUrl(blobId, { chain: 'sui' })
// Users access: https://aggregator.walrus-testnet.walrus.space/v1/blobs/...
```

#### ⚡ **Hosted WCDN Service: Premium**

```typescript
// You provide hosted WCDN service
const result = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://wcdn.walrus.space', // Your hosted service
})
// Users access: https://wcdn.walrus.space/cdn/... (fast cached!)
```

#### 🏢 **Enterprise: Self-Hosted**

```typescript
// Customer runs their own WCDN server
const result = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://customer-cdn.com', // Their server
})
```

### 📊 Feature Comparison

| Feature             | Free (Direct)    | Hosted WCDN       | Enterprise        |
| ------------------- | ---------------- | ----------------- | ----------------- |
| **File Access**     | ✅ Direct Walrus | ✅ + Fast cache   | ✅ + Custom cache |
| **Upload Files**    | ❌ Manual tools  | ✅ SDK upload     | ✅ SDK upload     |
| **Speed**           | ⏳ Walrus speed  | ⚡ Cached speed   | ⚡ Custom speed   |
| **Cache Analytics** | ❌               | ✅ Detailed stats | ✅ Full control   |
| **Global CDN**      | ❌               | ✅ Edge locations | ✅ Custom CDN     |
| **SLA/Support**     | ❌               | ✅ 99.9% uptime   | ✅ Custom SLA     |
| **Price**           | Free             | $10-50/month      | Custom pricing    |

### 💵 Pricing Model

```typescript
// Free: getWalrusCDNUrl() - direct Walrus access
const freeUrl = getWalrusCDNUrl(blobId)

// Starter: $10/month - 10GB cache, 100K requests
const starterResult = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://starter.wcdn.space',
})

// Pro: $50/month - 100GB cache, 1M requests, analytics
const proResult = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://pro.wcdn.space',
})

// Enterprise: Custom pricing - unlimited, custom domains, SLA
const enterpriseResult = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://customer-brand.com',
})
```

### 🎯 Value Propositions

**For Developers:**

- ✅ **Free tier**: No barriers to start using Walrus
- ✅ **Easy upgrade**: Same SDK, just change baseUrl
- ✅ **Instant performance**: Zero-delay file access
- ✅ **Multi-chain**: Works across all blockchains

**For You (WCDN Provider):**

- 💰 **Freemium model**: Free users → paid conversions
- 📈 **Scalable pricing**: Based on usage/features
- 🏢 **Enterprise deals**: Custom deployments
- 🔧 **Sticky SDK**: Hard to switch once integrated

## API Reference

### Zero-Config Functions

#### `getWalrusCDNUrl(blobId, options?)`

Generate CDN URLs - works with direct Walrus or your WCDN server:

```typescript
import { getWalrusCDNUrl } from '@walrus/cdn'

// Direct Walrus access (no server required)
const directUrl = getWalrusCDNUrl('your-blob-id', { chain: 'sui' })
// Returns: https://aggregator.walrus-testnet.walrus.space/v1/blobs/your-blob-id

// Cached access (with your WCDN server)
const cachedUrl = getWalrusCDNUrl('your-blob-id', {
  baseUrl: 'https://your-wcdn-server.com',
})
// Returns: https://your-wcdn-server.com/cdn/your-blob-id (cached!)

// Multi-chain support
const suiUrl = getWalrusCDNUrl('blob-id', { chain: 'sui' })
const ethUrl = getWalrusCDNUrl('blob-id', { chain: 'ethereum' })
const solUrl = getWalrusCDNUrl('blob-id', { chain: 'solana' })
```

### Upload Functions

#### `uploadAndGetInstantUrl(file, options)`

🚀 **The Ultimate Upload Function** - Upload + get instant cached URL in one call:

```typescript
import { uploadAndGetInstantUrl } from '@walrus/cdn'

const file = document.getElementById('fileInput').files[0]

// Upload + get instant cached URL (zero delay!)
const result = await uploadAndGetInstantUrl(file, {
  baseUrl: 'https://your-wcdn-server.com',
  chain: 'sui',
  filename: 'my-image.jpg',
})

console.log(result.url) // Instant cached URL
console.log(result.blobId) // Walrus blob ID
console.log(result.cached) // true - guaranteed cached
```

#### `uploadToWalrusWithCache(file, options)`

Upload file to Walrus with automatic caching:

```typescript
import { uploadToWalrusWithCache } from '@walrus/cdn'

const result = await uploadToWalrusWithCache(file, {
  baseUrl: 'https://your-wcdn-server.com',
  chain: 'sui',
  preloadCache: true, // Pre-warm cache for instant access
  vaultId: 'my-vault', // Optional: organize uploads
})

if (result.success) {
  console.log('Blob ID:', result.blobId)
  console.log('CDN URL:', result.cdnUrl)
  console.log('Cached:', result.cached)
}
```

#### Upload Options

```typescript
interface UploadOptions {
  chain?: 'sui' | 'ethereum' | 'solana'
  baseUrl?: string // Your WCDN server URL
  preloadCache?: boolean // Pre-warm cache (default: true)
  enableCache?: boolean // Enable caching (default: true)
  vaultId?: string // Optional vault organization
  filename?: string // Custom filename
}
```

### WCDNClient

The main client class for interacting with WCDN.

#### Constructor

```typescript
const client = createWCDNClient({
  baseURL: string,      // WCDN API base URL
  apiKey?: string,      // Optional API key for authentication
  timeout?: number      // Request timeout in milliseconds (default: 10000)
});
```

#### Methods

##### `getCDNUrl(cid: string): string`

Get the CDN URL for a given CID without making a request.

```typescript
const url = client.getCDNUrl('bafybeihabcxyz123...')
// Returns: http://localhost:3000/cdn/bafybeihabcxyz123...
```

##### `fetchContent(cid: string): Promise<ArrayBuffer>`

Fetch content directly from the CDN.

```typescript
const content = await client.fetchContent('bafybeihabcxyz123...')
const text = new TextDecoder().decode(content)
```

##### `getCIDStats(cid: string): Promise<CIDInfo>`

Get statistics and cache information for a specific CID.

```typescript
const info = await client.getCIDStats('bafybeihabcxyz123...')
console.log({
  cached: info.cached,
  pinned: info.pinned,
  requests: info.stats?.requests,
  hitRate: info.stats?.hitRate,
})
```

##### `preloadCIDs(cids: string[]): Promise<PreloadResult>`

Preload multiple CIDs to cache.

```typescript
const result = await client.preloadCIDs([
  'bafybeihabcxyz123...',
  'bafybeihabcxyz456...',
])

console.log(`Cached ${result.cached}/${result.total} CIDs`)
```

##### `pinCID(cid: string): Promise<{cid: string, status: string, cached: boolean}>`

Pin a CID to prevent it from being evicted from cache.

```typescript
await client.pinCID('bafybeihabcxyz123...')
```

##### `unpinCID(cid: string): Promise<{cid: string, status: string}>`

Unpin a CID, allowing it to be evicted from cache.

```typescript
await client.unpinCID('bafybeihabcxyz123...')
```

##### `getMetrics(): Promise<MetricsResponse>`

Get global CDN metrics and statistics.

```typescript
const metrics = await client.getMetrics()
console.log({
  totalRequests: metrics.global.totalRequests,
  hitRate: metrics.global.globalHitRate,
  topCIDs: metrics.topCIDs,
})
```

##### `getCacheStats(): Promise<CacheStats>`

Get detailed cache statistics.

```typescript
const cacheStats = await client.getCacheStats()
console.log({
  backend: cacheStats.using,
  memoryKeys: cacheStats.memory.keys,
  redisKeys: cacheStats.redis.keys,
})
```

##### `clearCache(): Promise<{status: string}>`

Clear all cache (requires appropriate permissions).

```typescript
await client.clearCache()
```

##### `healthCheck(): Promise<HealthResponse>`

Check CDN health status.

```typescript
const health = await client.healthCheck()
console.log(health.status) // 'ok'
```

### Utility Functions

#### `getCDNUrl(cid: string, baseURL?: string): string`

Convenience function to get CDN URL without creating a client.

```typescript
import { getCDNUrl } from '@wcdn/sdk'

const url = getCDNUrl('bafybeihabcxyz123...', 'https://cdn.example.com')
```

#### `validateCID(cid: string): boolean`

Validate CID format.

```typescript
import { validateCID } from '@wcdn/sdk'

if (validateCID('bafybeihabcxyz123...')) {
  // Valid CID
}
```

#### Formatting Utilities

```typescript
import { utils } from '@wcdn/sdk'

utils.formatBytes(1024) // "1.0 KB"
utils.formatNumber(1500) // "1.5K"
utils.formatPercentage(0.85) // "85.0%"
utils.formatLatency(250) // "250ms"
utils.truncateCID('bafybeihabcxyz123...', 6) // "bafybe...xyz123"
```

## Error Handling

The SDK throws standard JavaScript errors. Wrap API calls in try-catch blocks:

```typescript
try {
  const stats = await client.getCIDStats('invalid-cid')
} catch (error) {
  if (error.response?.status === 404) {
    console.log('CID not found')
  } else if (error.response?.status === 400) {
    console.log('Invalid CID format')
  } else {
    console.log('Network or server error')
  }
}
```

## React Integration

```typescript
import { createWCDNClient } from '@wcdn/sdk';
import { useState, useEffect } from 'react';

const client = createWCDNClient({
  baseURL: 'http://localhost:3000/api'
});

function CIDComponent({ cid }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.getCIDStats(cid)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cid]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Cached: {stats.cached ? 'Yes' : 'No'}</p>
      <p>Requests: {stats.stats?.requests || 0}</p>
      <img src={client.getCDNUrl(cid)} alt="Content" />
    </div>
  );
}
```

## TypeScript Support

The SDK is written in TypeScript and includes complete type definitions:

```typescript
import { WCDNClient, CIDStats, MetricsResponse } from '@wcdn/sdk'

const client: WCDNClient = createWCDNClient({
  baseURL: 'http://localhost:3000/api',
})

const stats: CIDStats = await client.getCIDStats('...')
const metrics: MetricsResponse = await client.getMetrics()
```

## Node.js vs Browser

The SDK works in both Node.js and browser environments. In Node.js, you might want to use it for server-side preloading:

```typescript
// server.js
import { createWCDNClient } from '@wcdn/sdk'

const client = createWCDNClient({
  baseURL: 'http://localhost:3000/api',
})

// Preload critical content on server start
await client.preloadCIDs([
  'bafybeihabcxyz123...', // landing page images
  'bafybeihabcxyz456...', // app assets
])
```

## Summary

### 🎯 Perfect Developer Experience

The `@walrus/cdn` SDK provides a seamless journey from free usage to enterprise deployment:

```typescript
// Start free - just access files
const url = getWalrusCDNUrl(blobId)

// Upgrade to instant uploads
const result = await uploadAndGetInstantUrl(file, { baseUrl: 'your-server' })

// Scale to enterprise
const client = new WalrusCDNClient({ baseUrl: 'enterprise-cdn' })
```

### 🔄 Complete Flow

1. **Developer**: Uses SDK to upload files
2. **WCDN Server**: Stores to Walrus + caches locally
3. **End Users**: Get instant access via cached URLs
4. **Everyone Wins**: Fast performance + decentralized storage

### 🚀 Why This Architecture Works

- ✅ **No vendor lock-in**: Direct Walrus access always available
- ✅ **Progressive enhancement**: Add caching when needed
- ✅ **Multi-chain ready**: Works across all blockchains
- ✅ **Scalable business model**: Free → paid → enterprise
- ✅ **Developer friendly**: Same SDK, different baseUrl

Ready to build the next generation of Web3 applications with instant file access? Start with `getWalrusCDNUrl()` today! 🚀

## Error Handling

The SDK throws standard JavaScript errors. Always wrap API calls in try-catch blocks:

```typescript
import { uploadAndGetInstantUrl, getWalrusCDNUrl } from '@walrus/cdn'

try {
  const result = await uploadAndGetInstantUrl(file, {
    baseUrl: 'https://your-wcdn-server.com',
  })
  console.log('Success:', result.url)
} catch (error) {
  if (error.message.includes('400')) {
    console.log('Invalid file or parameters')
  } else if (error.message.includes('404')) {
    console.log("WCDN server not found or blob doesn't exist")
  } else if (error.message.includes('500')) {
    console.log('Server error - try again later')
  } else {
    console.log('Network error:', error.message)
  }
}
```

### Common Error Codes

| Error                      | Cause                                | Solution                         |
| -------------------------- | ------------------------------------ | -------------------------------- |
| `400 - Invalid CID format` | Malformed blob ID                    | Check blob ID format             |
| `404 - Blob not found`     | Blob doesn't exist or not synced yet | Wait 1-2 minutes for sync        |
| `429 - Rate limited`       | Too many requests                    | Add delays between requests      |
| `500 - Server error`       | WCDN server issues                   | Check server status, retry later |
| `BLOB_NOT_AVAILABLE_YET`   | Recently uploaded blob               | Wait for aggregator sync         |

## Best Practices

### 📁 File Management

```typescript
// ✅ Good: Check file size before upload
if (file.size > 100 * 1024 * 1024) {
  // 100MB
  console.warn('Large file - consider compression')
}

// ✅ Good: Use meaningful filenames
const result = await uploadAndGetInstantUrl(file, {
  filename: `avatar-${userId}-${Date.now()}.jpg`,
})

// ✅ Good: Pre-load frequently accessed files
await client.preloadCIDs(['popular-nft-1', 'game-asset-2', 'trending-image-3'])
```

### ⚡ Performance Optimization

```typescript
// ✅ Good: Use cache for repeated access
const cachedUrl = getWalrusCDNUrl(blobId, {
  baseUrl: 'https://your-wcdn-server.com', // Cached
})

// ⚠️ Okay: Direct access (slower but always works)
const directUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })

// ✅ Good: Batch operations when possible
const results = await Promise.all([
  uploadAndGetInstantUrl(file1, options),
  uploadAndGetInstantUrl(file2, options),
  uploadAndGetInstantUrl(file3, options),
])
```

### 🔐 Security Best Practices

```typescript
// ✅ Good: Validate files before upload
function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 50 * 1024 * 1024 // 50MB

  return allowedTypes.includes(file.type) && file.size <= maxSize
}

// ✅ Good: Don't expose blob IDs of sensitive content
// Even though Walrus is public, don't make blob IDs easy to guess
const randomSuffix = Math.random().toString(36).substring(7)
const filename = `public-asset-${randomSuffix}.jpg`
```

## FAQ

### **Q: Is my data stored permanently on Walrus?**

A: Yes! Once uploaded, data is stored across the decentralized Walrus network and cannot be deleted. This is different from traditional cloud storage.

### **Q: Why do I see `about:blank` in the URL bar when viewing images?**

A: This is normal when using our image display feature. The content is correct - `about:blank` just means we're dynamically generating the HTML for optimal image viewing.

### **Q: Can I delete uploaded files?**

A: No, Walrus is immutable storage. Once uploaded, files cannot be deleted. Only upload content you're comfortable being permanent and public.

### **Q: What's the difference between CDN URL and Direct URL?**

```typescript
// CDN URL: Fast cached access via your WCDN server
const cdnUrl = getWalrusCDNUrl(blobId, {
  baseUrl: 'https://your-wcdn-server.com',
}) // ⚡ Fast

// Direct URL: Direct access via Walrus aggregators
const directUrl = getWalrusCDNUrl(blobId, { chain: 'sui' }) // 🌍 Decentralized
```

### **Q: How long does it take for uploaded files to be accessible?**

A: Usually 1-2 minutes for Walrus aggregators to sync. With WCDN caching, access is instant after upload.

### **Q: Can I use this in React Native / mobile apps?**

A: Yes! The SDK works in React Native, Expo, and mobile web apps. Just import and use as normal.

### **Q: Do I need to run my own WCDN server?**

A: No, you have options:

- **Free**: Use direct Walrus URLs (no server needed)
- **Hosted**: Use a hosted WCDN service
- **Self-hosted**: Run your own WCDN server for full control

### **Q: What file types are supported?**

A: All file types! Images, videos, documents, archives, code files - anything you can upload to Walrus.

## Examples & Templates

### 🖼️ NFT Marketplace Template

```typescript
import { uploadAndGetInstantUrl, getWalrusCDNUrl } from '@walrus/cdn'

// Upload NFT artwork
async function mintNFT(artworkFile: File, metadata: any) {
  // Upload artwork with instant cached access
  const artResult = await uploadAndGetInstantUrl(artworkFile, {
    baseUrl: 'https://nft-cdn.example.com',
    chain: 'sui',
  })

  // Upload metadata JSON
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: 'application/json',
  })
  const metaResult = await uploadAndGetInstantUrl(metadataBlob, {
    baseUrl: 'https://nft-cdn.example.com',
    filename: 'metadata.json',
  })

  return {
    imageUrl: artResult.url, // Instant access
    metadataUrl: metaResult.url, // Instant access
    imageBlobId: artResult.blobId,
    metadataBlobId: metaResult.blobId,
  }
}
```

### 🎮 Game Asset Manager

```typescript
// Pre-load game assets for instant access
async function preloadGameAssets(assetBlobIds: string[]) {
  const client = new WalrusCDNClient({
    baseUrl: 'https://game-cdn.example.com',
  })

  // Pre-load all assets
  await client.preloadCIDs(assetBlobIds)

  // Generate instant URLs
  return assetBlobIds.map((blobId) => ({
    blobId,
    url: getWalrusCDNUrl(blobId, {
      baseUrl: 'https://game-cdn.example.com',
    }),
  }))
}
```

### 🌐 Multi-Chain DApp

```typescript
// Display assets from multiple chains
function MultiChainAssetViewer({ assets }: {
  assets: Array<{ blobId: string; chain: 'sui' | 'ethereum' | 'solana' }>
}) {
  return (
    <div className="asset-grid">
      {assets.map(asset => (
        <img
          key={asset.blobId}
          src={getWalrusCDNUrl(asset.blobId, { chain: asset.chain })}
          alt={`Asset from ${asset.chain}`}
          className="asset-thumbnail"
        />
      ))}
    </div>
  );
}
```

## Community & Support

### 📚 Official Resources

- [Walrus Documentation](https://docs.walrus.site)
- [Walrus Developer Guide](https://docs.walrus.site/dev-guide)
- [Security Best Practices](https://docs.walrus.site/security)

### 💬 Community

- [Discord](https://discord.gg/walrus) - Get help and discuss with the community
- [Twitter](https://twitter.com/walrusprotocol) - Follow for updates and announcements
- [GitHub](https://github.com/walrus-ecosystem/wcdn) - Source code and issue tracking

### 🐛 Report Issues

Found a bug or have a feature request?

- [Create an issue](https://github.com/walrus-ecosystem/wcdn/issues)
- [SDK Issues](https://github.com/walrus-ecosystem/wcdn/issues?q=label%3Asdk)
- [Documentation Issues](https://github.com/walrus-ecosystem/wcdn/issues?q=label%3Adocs)

### 💡 Get Help

- Check the [FAQ](#faq) above
- Search [existing issues](https://github.com/walrus-ecosystem/wcdn/issues)
- Ask in [Discord #developer-support](https://discord.gg/walrus)
- Email: support@walrus.space

## Contributing

We welcome contributions! Here's how to get started:

### 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/walrus-ecosystem/wcdn.git
cd wcdn/packages/sdk

# Install dependencies
npm install

# Run tests
npm test

# Build the SDK
npm run build
```

### 📝 Contributing Guidelines

1. **Issues**: Check existing issues before creating new ones
2. **Pull Requests**:
   - Fork the repository
   - Create a feature branch: `git checkout -b feature/your-feature`
   - Write tests for new functionality
   - Ensure all tests pass: `npm test`
   - Submit a pull request with clear description

3. **Code Style**:
   - Use TypeScript
   - Follow the existing code style
   - Add JSDoc comments for public APIs
   - Update README if adding new features

### 🎯 Areas We Need Help

- [ ] Python SDK
- [ ] Go SDK
- [ ] Unity SDK for game developers
- [ ] React Native optimizations
- [ ] More example templates
- [ ] Improved error messages
- [ ] Performance optimizations

### 📋 Development Roadmap

**Next Release (v1.1.0)**

- [ ] Batch upload operations
- [ ] File compression options
- [ ] Enhanced error messages
- [ ] CLI tool

**Future Releases**

- [ ] Multi-language SDKs
- [ ] Advanced caching strategies
- [ ] Webhook integrations
- [ ] Monitoring dashboard

## License

MIT

---

**Ready to build the next generation of Web3 applications with instant file access?**

Start with `getWalrusCDNUrl()` today! 🚀

**Questions?** Join our [Discord](https://discord.gg/walrus) or check the [FAQ](#faq).
