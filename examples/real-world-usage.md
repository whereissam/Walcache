# Real-World WCDN SDK Usage Guide

## 🚀 Production Integration

### 1. Install the SDK
```bash
npm install @wcdn/sdk
# or
bun add @wcdn/sdk
```

### 2. Basic Setup (Simple CDN URLs)
```typescript
import { getWalrusCDNUrl, configure } from '@wcdn/sdk'

// Configure your CDN endpoint
configure({
  baseUrl: 'https://cdn.yourdomain.com', // Your WCDN server
  apiKey: 'your-production-api-key'
})

// Generate optimized CDN URLs
const cdnUrl = getWalrusCDNUrl('your-blob-id', {
  chain: 'sui', // or 'ethereum', 'solana'
  params: { 
    network: 'mainnet',
    cache: true 
  }
})
console.log(cdnUrl) // https://cdn.yourdomain.com/v1/your-blob-id?chain=sui&network=mainnet
```

### 3. Advanced Usage (Full Client)
```typescript
import { WalrusCDNClient } from '@wcdn/sdk'

const client = new WalrusCDNClient({
  baseUrl: 'https://cdn.yourdomain.com',
  apiKey: 'your-production-api-key',
  timeout: 30000
})

// Upload and get optimized URL
async function uploadAndCache(file: File) {
  try {
    // Upload to Walrus
    const upload = await client.uploadToWalrus(file)
    console.log('Blob ID:', upload.blobId)
    
    // Get cached CDN URL
    const cdnUrl = getWalrusCDNUrl(upload.blobId, {
      chain: 'sui',
      params: { cache: true }
    })
    
    // Preload into cache for faster access
    await client.preloadCIDs([upload.blobId])
    
    return {
      blobId: upload.blobId,
      cdnUrl,
      directUrl: upload.directUrl
    }
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}
```

### 4. Multi-Chain Asset Verification
```typescript
import { verifyMultiChain, getAdvancedWalrusCDNUrl } from '@wcdn/sdk'

// Verify NFT ownership across chains
async function verifyAndServe(blobId: string, userAddress: string, tokenId: string) {
  const result = await getAdvancedWalrusCDNUrl(blobId, {
    baseUrl: 'https://cdn.yourdomain.com',
    chain: 'ethereum',
    verification: {
      userAddress,
      assetId: tokenId,
      contractAddress: '0x...' // Your NFT contract
    },
    nodeSelectionStrategy: 'fastest'
  })
  
  if (result.verification?.hasAccess) {
    return result.url // User can access content
  } else {
    throw new Error('Access denied: NFT ownership required')
  }
}
```

### 5. React Hook Integration
```typescript
import { useState, useEffect } from 'react'
import { WalrusCDNClient } from '@wcdn/sdk'

export function useWalrusCDN(blobId: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cdnUrl, setCdnUrl] = useState<string | null>(null)
  
  useEffect(() => {
    const client = new WalrusCDNClient({
      baseUrl: process.env.NEXT_PUBLIC_WCDN_URL!,
      apiKey: process.env.NEXT_PUBLIC_WCDN_API_KEY!
    })
    
    async function loadContent() {
      try {
        setLoading(true)
        const info = await client.getCIDInfo(blobId)
        const url = getWalrusCDNUrl(blobId, { 
          chain: 'sui',
          params: { cache: true }
        })
        setCdnUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    
    if (blobId) loadContent()
  }, [blobId])
  
  return { loading, error, cdnUrl }
}
```

### 6. Production Deployment

#### Frontend (.env.production)
```bash
NEXT_PUBLIC_WCDN_URL=https://cdn.yourdomain.com
NEXT_PUBLIC_WCDN_API_KEY=prod-api-key-2024
```

#### Backend (Docker deployment)
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 4500
ENV NODE_ENV=production
ENV API_KEY_SECRET=prod-api-key-2024
ENV REDIS_URL=redis://redis:6379
CMD ["bun", "start"]
```

### 7. Real-World Examples

#### Image Gallery
```typescript
function ImageGallery({ blobIds }: { blobIds: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {blobIds.map(blobId => (
        <img 
          key={blobId}
          src={getWalrusCDNUrl(blobId, { 
            chain: 'sui',
            params: { 
              cache: true,
              format: 'webp', // Optional: image optimization
              width: 400 
            }
          })}
          alt="Gallery image"
          loading="lazy"
        />
      ))}
    </div>
  )
}
```

#### NFT Marketplace
```typescript
async function servePremiumContent(blobId: string, userWallet: string) {
  // Verify user owns premium NFT
  const verification = await verifyMultiChain(['ethereum'], {
    userAddress: userWallet,
    assetId: 'premium-pass',
    contractAddress: '0x...'
  })
  
  if (verification.hasAccess) {
    return getWalrusCDNUrl(blobId, {
      chain: 'ethereum',
      params: { 
        cache: true,
        private: true // Authorized access only
      }
    })
  }
  
  throw new Error('Premium NFT required')
}
```

## 🎯 Key Benefits

1. **Performance**: Intelligent caching + CDN acceleration
2. **Multi-chain**: Same API for Sui, Ethereum, Solana
3. **Security**: API key authentication + NFT gating
4. **Reliability**: Automatic failover + health monitoring
5. **Simple**: One line of code for basic usage

## 📚 Migration from Current Demo

Replace this:
```typescript
// Current demo code
const cdnUrl = `http://localhost:4500/cdn/${blobId}`
```

With this:
```typescript
// Production SDK
import { getWalrusCDNUrl } from '@wcdn/sdk'
const cdnUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })
```

This makes your app **production-ready** with proper error handling, multi-chain support, and optimal performance! 🚀