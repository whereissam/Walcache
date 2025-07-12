# WCDN v1 API Reference

A Stripe-style API for the Walrus Content Delivery Network with consistent resource structures, standardized error handling, and cursor-based pagination.

## Quick Start

```javascript
import { WalrusCDNClient } from '@walcache/sdk'

// Initialize client (Stripe-style)
const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: process.env.WCDN_API_KEY
})
```

## Core Resources

All resources follow Stripe's standard structure:

```javascript
{
  id: "blob_1234567890",      // Unique identifier
  object: "blob",             // Resource type
  created: 1641234567,        // Unix timestamp
  // ... resource-specific fields
}
```

### BlobResource

Represents content stored in the Walrus network.

```javascript
{
  id: "blob_1234567890",
  object: "blob",
  created: 1641234567,
  cid: "bafybeig...",         // Content identifier
  size: 1024576,             // Size in bytes
  content_type: "image/jpeg", // MIME type
  cached: true,              // Whether cached
  pinned: false,             // Whether pinned
  cache_date: 1641234567,    // When cached
  ttl: 3600,                 // Time to live
  source: "upload"           // Source of blob
}
```

### UploadResource

Represents a file upload operation.

```javascript
{
  id: "upload_1234567890",
  object: "upload",
  created: 1641234567,
  filename: "image.jpg",
  size: 1024576,
  content_type: "image/jpeg",
  blob_id: "blob_1234567890",
  status: "completed",        // processing | completed | failed
  vault_id: "vault_123",      // Optional vault
  parent_id: "folder_456"     // Optional parent folder
}
```

### CacheResource

Represents a cached item.

```javascript
{
  id: "cache_1234567890",
  object: "cache",
  created: 1641234567,
  blob_id: "blob_1234567890",
  size: 1024576,
  pinned: false,
  ttl: 3600,
  expires_at: 1641238167,
  last_accessed: 1641234567
}
```

### AnalyticsResource

Represents usage statistics for a blob.

```javascript
{
  id: "analytics_1234567890",
  object: "analytics",
  created: 1641234567,
  blob_id: "blob_1234567890",
  total_requests: 1500,
  cache_hits: 1200,
  cache_misses: 300,
  total_bytes_served: 1536000000,
  last_accessed: 1641234567,
  geographic_stats: {
    "US": 800,
    "EU": 500,
    "ASIA": 200
  }
}
```

## API Methods

### Blob Operations

```javascript
// Get blob information
const blob = await client.getBlob('blob_1234567890')

// List blobs with pagination
const blobs = await client.listBlobs({
  limit: 10,
  starting_after: 'blob_123',
  cached: true,
  pinned: false
})

// Pin/unpin blobs
const pinnedBlob = await client.pinBlob('blob_1234567890')
const unpinnedBlob = await client.unpinBlob('blob_1234567890')
```

### Upload Operations

```javascript
// Upload file
const upload = await client.createUpload(file, {
  vault_id: 'vault_123',
  parent_id: 'folder_456'
})

// Get upload status
const upload = await client.getUpload('upload_1234567890')

// List uploads
const uploads = await client.listUploads({
  limit: 10,
  vault_id: 'vault_123',
  status: 'completed'
})
```

### Cache Management

```javascript
// Preload blobs into cache
const result = await client.preloadBlobs([
  'blob_123', 'blob_456', 'blob_789'
])

// Get cache entry
const entry = await client.getCacheEntry('blob_1234567890')

// List cache entries
const entries = await client.listCacheEntries({
  limit: 10,
  pinned: true
})

// Get cache statistics
const stats = await client.getCacheStats()

// Clear cache
await client.clearCache(['blob_123', 'blob_456']) // Specific blobs
await client.clearCache() // All cache
```

### Analytics

```javascript
// Get blob analytics
const analytics = await client.getBlobAnalytics('blob_1234567890')

// List analytics with filtering
const analytics = await client.listAnalytics({
  limit: 10,
  blob_id: 'blob_123',
  period: '24h'
})

// Get global analytics
const global = await client.getGlobalAnalytics()

// Get Prometheus metrics
const metrics = await client.getPrometheusMetrics()
```

### URL Generation

```javascript
// Basic CDN URL
const url = client.getCDNUrl('blob_1234567890')

// Multi-chain URL
const url = client.getMultiChainCDNUrl('blob_1234567890', {
  chain: 'ethereum',
  params: { optimize: 'true' }
})

// Advanced URL with verification
const result = await client.getAdvancedCDNUrl('blob_1234567890', {
  chain: 'sui',
  skipVerification: false,
  nodeSelectionStrategy: 'fastest',
  verification: {
    userAddress: '0x123...',
    assetId: 'nft_456'
  }
})
```

## Pagination

All list endpoints support cursor-based pagination:

```javascript
// First page
const firstPage = await client.listBlobs({ limit: 10 })

// Next page
const nextPage = await client.listBlobs({
  limit: 10,
  starting_after: firstPage.data[firstPage.data.length - 1].id
})

// Previous page
const prevPage = await client.listBlobs({
  limit: 10,
  ending_before: firstPage.data[0].id
})

// Check if more pages exist
if (firstPage.has_more) {
  console.log('More pages available')
}
```

## Error Handling

All errors follow a standardized format:

```javascript
try {
  await client.getBlob('invalid-id')
} catch (error) {
  if (error instanceof WalrusCDNError) {
    console.log('Error Type:', error.type)       // 'not_found_error'
    console.log('Error Code:', error.code)       // 'BLOB_NOT_FOUND'
    console.log('Error Message:', error.message) // 'Blob not found'
    console.log('HTTP Status:', error.status)    // 404
    console.log('Parameter:', error.param)       // 'blobId'
    
    // Convert to API error format
    const apiError = error.toApiError()
    /*
    {
      "error": {
        "type": "not_found_error",
        "message": "Blob not found",
        "code": "BLOB_NOT_FOUND",
        "param": "blobId"
      }
    }
    */
  }
}
```

### Error Types

- `validation_error` - Invalid input parameters
- `authentication_error` - Invalid or missing API key
- `permission_error` - Access denied
- `not_found_error` - Resource not found
- `rate_limit_error` - Too many requests
- `api_error` - Server error
- `network_error` - Network/connectivity issues

## Multi-Chain Support

```javascript
// Verify asset ownership
const verification = await client.verifyAsset('ethereum', {
  userAddress: '0x123...',
  assetId: 'nft_456',
  contractAddress: '0xabc...'
})

// Multi-chain verification
const multiResult = await client.verifyMultiChain(['ethereum', 'sui'], {
  userAddress: '0x123...',
  assetId: 'nft_456'
})

// Check blob status across chains
const status = await client.getMultiChainBlobStatus('blob_123', [
  'ethereum', 'sui', 'solana'
])

// Select optimal node
const node = await client.selectOptimalNode('ethereum', 'fastest')
```

## Authentication

Include your API key in the client configuration:

```javascript
const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: 'your-api-key-here'
})
```

The SDK automatically includes the API key in the Authorization header:
```
Authorization: Bearer your-api-key-here
```

## Rate Limiting

The API implements rate limiting. When exceeded, you'll receive a `rate_limit_error`:

```javascript
{
  "error": {
    "type": "rate_limit_error",
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

Implement exponential backoff for retry logic.

## Health Check

```javascript
// Check if CDN service is healthy
const isHealthy = await client.healthCheck()
console.log('Service health:', isHealthy)
```

## TypeScript Support

Full TypeScript support with all resource types:

```typescript
import { 
  WalrusCDNClient,
  BlobResource,
  UploadResource,
  CacheResource,
  AnalyticsResource,
  PaginatedList,
  WalrusCDNError
} from '@walcache/sdk'

const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: process.env.WCDN_API_KEY!
})

const blobs: PaginatedList<BlobResource> = await client.listBlobs()
```

## Migration from Legacy API

### Before (Legacy API)
```javascript
// Legacy API
const response = await fetch('/api/stats/blob_123')
const data = await response.json()
```

### After (v1 API)
```javascript
// v1 API
const analytics = await client.getBlobAnalytics('blob_123')
```

The v1 API provides:
- ✅ Consistent resource structures
- ✅ Standardized error handling  
- ✅ Built-in pagination
- ✅ Type safety
- ✅ Better documentation
- ✅ Stripe-style design patterns

## Complete Example

```javascript
import { WalrusCDNClient } from '@walcache/sdk'

const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: process.env.WCDN_API_KEY
})

async function example() {
  try {
    // Upload a file
    const upload = await client.createUpload(file, {
      vault_id: 'vault_123'
    })
    
    // Get blob information
    const blob = await client.getBlob(upload.blob_id)
    
    // Generate CDN URL
    const url = client.getCDNUrl(blob.cid)
    
    // Pin blob to prevent eviction
    await client.pinBlob(blob.id)
    
    // Get analytics
    const analytics = await client.getBlobAnalytics(blob.id)
    
    console.log('Upload successful:', {
      blobId: blob.id,
      url,
      size: blob.size,
      requests: analytics.total_requests
    })
    
  } catch (error) {
    console.error('Operation failed:', error.message)
  }
}
```