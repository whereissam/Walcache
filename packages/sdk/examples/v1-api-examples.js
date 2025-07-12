/**
 * WCDN v1 API Examples - Stripe-style API Usage
 * 
 * This file demonstrates how to use the new v1 API with Stripe-style
 * resource management, consistent error handling, and pagination.
 */

import { WalrusCDNClient, WalrusCDNError } from '../src/index.js'

// Initialize client (similar to Stripe)
const client = new WalrusCDNClient({
  baseUrl: 'http://localhost:4500',
  apiKey: process.env.WCDN_API_KEY || 'dev-secret-wcdn-2024',
})

console.log('🚀 WCDN v1 API Examples\n')

// Example 1: Basic Blob Operations
console.log('📦 Example 1: Basic Blob Operations')
async function basicBlobOperations() {
  try {
    // List all blobs with pagination
    const blobs = await client.listBlobs({
      limit: 10,
      cached: true
    })
    
    console.log(`Found ${blobs.data.length} cached blobs`)
    
    if (blobs.data.length > 0) {
      const firstBlob = blobs.data[0]
      
      // Get detailed blob information
      const blobDetails = await client.getBlob(firstBlob.id)
      console.log(`Blob ${blobDetails.id}:`)
      console.log(`  - Size: ${blobDetails.size} bytes`)
      console.log(`  - Content Type: ${blobDetails.content_type}`)
      console.log(`  - Cached: ${blobDetails.cached}`)
      console.log(`  - Pinned: ${blobDetails.pinned}`)
      console.log(`  - Created: ${new Date(blobDetails.created * 1000).toISOString()}`)
      
      // Generate CDN URL
      const url = client.getCDNUrl(blobDetails.cid)
      console.log(`  - CDN URL: ${url}`)
    }
    
  } catch (error) {
    console.error('Blob operations failed:', error.message)
  }
}

// Example 2: File Upload with v1 API
console.log('\n📤 Example 2: File Upload')
async function uploadExample() {
  try {
    // Create a test file
    const testContent = 'Hello from WCDN v1 API!'
    const file = new File([testContent], 'test.txt', { type: 'text/plain' })
    
    // Upload using v1 API
    const upload = await client.createUpload(file, {
      vault_id: 'default',
      parent_id: undefined
    })
    
    console.log('Upload created:')
    console.log(`  - ID: ${upload.id}`)
    console.log(`  - Filename: ${upload.filename}`)
    console.log(`  - Status: ${upload.status}`)
    console.log(`  - Blob ID: ${upload.blob_id}`)
    console.log(`  - Size: ${upload.size} bytes`)
    
    // Get upload details
    const uploadDetails = await client.getUpload(upload.id)
    console.log(`Upload status: ${uploadDetails.status}`)
    
    // Generate CDN URL for the uploaded content
    const cdnUrl = client.getCDNUrl(upload.blob_id)
    console.log(`CDN URL: ${cdnUrl}`)
    
  } catch (error) {
    console.error('Upload failed:', error.message)
  }
}

// Example 3: Cache Management
console.log('\n🗄️ Example 3: Cache Management')
async function cacheManagement() {
  try {
    // Get cache statistics
    const stats = await client.getCacheStats()
    console.log('Cache Statistics:')
    console.log(`  - Total Entries: ${stats.total_entries}`)
    console.log(`  - Total Size: ${(stats.total_size_bytes / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  - Pinned Entries: ${stats.pinned_entries}`)
    console.log(`  - Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}%`)
    console.log(`  - Redis Connected: ${stats.redis_connected}`)
    
    // List cache entries
    const cacheEntries = await client.listCacheEntries({
      limit: 5,
      pinned: false
    })
    
    console.log(`\nCache Entries (${cacheEntries.data.length}):`);
    cacheEntries.data.forEach(entry => {
      console.log(`  - ${entry.blob_id}: ${entry.size} bytes, TTL: ${entry.ttl}s`)
    })
    
  } catch (error) {
    console.error('Cache management failed:', error.message)
  }
}

// Example 4: Analytics and Monitoring
console.log('\n📊 Example 4: Analytics and Monitoring')
async function analyticsExample() {
  try {
    // Get global analytics
    const analytics = await client.getGlobalAnalytics()
    
    console.log('Global Analytics:')
    console.log(`  - Total Requests: ${analytics.global.total_requests}`)
    console.log(`  - Cache Hits: ${analytics.global.cache_hits}`)
    console.log(`  - Cache Misses: ${analytics.global.cache_misses}`)
    console.log(`  - Hit Rate: ${((analytics.global.cache_hits / analytics.global.total_requests) * 100).toFixed(1)}%`)
    console.log(`  - Unique CIDs: ${analytics.global.unique_cids}`)
    console.log(`  - Total Bytes Served: ${(analytics.global.total_bytes_served / 1024 / 1024).toFixed(2)} MB`)
    
    // System metrics
    console.log('\nSystem Metrics:')
    console.log(`  - Memory Usage: ${analytics.system.memory_usage.toFixed(1)}%`)
    console.log(`  - CPU Usage: ${analytics.system.cpu_usage.toFixed(1)}%`)
    console.log(`  - Uptime: ${Math.floor(analytics.system.uptime / 3600)}h`)
    
    // Top performing blobs
    if (analytics.top_blobs && analytics.top_blobs.length > 0) {
      console.log('\nTop Performing Blobs:')
      analytics.top_blobs.slice(0, 3).forEach((blob, index) => {
        console.log(`  ${index + 1}. ${blob.cid}: ${blob.requests} requests`)
      })
    }
    
  } catch (error) {
    console.error('Analytics failed:', error.message)
  }
}

// Example 5: Error Handling (v1 API format)
console.log('\n❌ Example 5: Error Handling')
async function errorHandlingExample() {
  try {
    // Try to get a non-existent blob
    await client.getBlob('non-existent-blob-id')
  } catch (error) {
    if (error instanceof WalrusCDNError) {
      console.log('Caught WalrusCDNError:')
      console.log(`  - Type: ${error.type}`)
      console.log(`  - Code: ${error.code}`)
      console.log(`  - Message: ${error.message}`)
      console.log(`  - Status: ${error.status}`)
      
      // Convert back to API error format
      const apiError = error.toApiError()
      console.log('  - API Error Format:', JSON.stringify(apiError, null, 2))
    } else {
      console.log('Unexpected error:', error.message)
    }
  }
}

// Example 6: Pagination
console.log('\n📄 Example 6: Pagination')
async function paginationExample() {
  try {
    console.log('Demonstrating cursor-based pagination...')
    
    let hasMore = true
    let startingAfter = undefined
    let page = 1
    let totalBlobs = 0
    
    while (hasMore && page <= 3) { // Limit to 3 pages for demo
      const blobs = await client.listBlobs({
        limit: 5,
        starting_after: startingAfter
      })
      
      console.log(`Page ${page}: ${blobs.data.length} blobs`)
      blobs.data.forEach(blob => {
        console.log(`  - ${blob.id}: ${blob.size} bytes`)
      })
      
      totalBlobs += blobs.data.length
      hasMore = blobs.has_more
      
      if (blobs.data.length > 0) {
        startingAfter = blobs.data[blobs.data.length - 1].id
      }
      
      page++
    }
    
    console.log(`Total blobs processed: ${totalBlobs}`)
    
  } catch (error) {
    console.error('Pagination failed:', error.message)
  }
}

// Example 7: Multi-chain URL Generation
console.log('\n🌐 Example 7: Multi-chain URL Generation')
async function multiChainExample() {
  const testBlobId = 'example-blob-id-123'
  
  try {
    // Generate URLs for different chains
    const chains = ['sui', 'ethereum', 'solana']
    
    console.log(`Generating URLs for blob: ${testBlobId}`)
    
    chains.forEach(chain => {
      const url = client.getMultiChainCDNUrl(testBlobId, { 
        chain,
        params: { optimize: 'true' }
      })
      console.log(`  - ${chain.toUpperCase()}: ${url}`)
    })
    
    // Generate advanced URL with options
    const advancedUrl = await client.getAdvancedCDNUrl(testBlobId, {
      chain: 'sui',
      skipVerification: true,
      nodeSelectionStrategy: 'fastest',
      params: { 
        format: 'webp',
        quality: '85'
      }
    })
    
    console.log('Advanced URL result:')
    console.log(`  - URL: ${advancedUrl.url}`)
    console.log(`  - Node Selection: ${advancedUrl.nodeSelection ? 'Optimized' : 'Default'}`)
    
  } catch (error) {
    console.error('Multi-chain URL generation failed:', error.message)
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await basicBlobOperations()
    await uploadExample()
    await cacheManagement()
    await analyticsExample()
    await errorHandlingExample()
    await paginationExample()
    await multiChainExample()
    
    console.log('\n✅ All v1 API examples completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error.message)
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
}

export {
  basicBlobOperations,
  uploadExample,
  cacheManagement,
  analyticsExample,
  errorHandlingExample,
  paginationExample,
  multiChainExample,
  runAllExamples
}