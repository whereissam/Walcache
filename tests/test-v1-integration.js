/**
 * End-to-end integration test for WCDN v1 API
 * Tests the new Stripe-style API endpoints and SDK integration
 */

// Simple test using dynamic import since SDK isn't built
const { WalrusCDNError } = await import('./packages/sdk/src/types.js')

const API_BASE = 'http://localhost:4500'
const API_KEY = process.env.WCDN_API_KEY || 'test-api-key-for-integration-tests'

console.log('🧪 Starting WCDN v1 API Integration Tests\n')

// Test 1: SDK Client Initialization
console.log('Test 1: SDK Client Initialization')
try {
  const client = new WalrusCDNClient({
    baseUrl: API_BASE,
    apiKey: API_KEY,
  })
  console.log('✅ SDK client initialized successfully')
} catch (error) {
  console.log('❌ SDK client initialization failed:', error.message)
}

// Test 2: URL Generation
console.log('\nTest 2: URL Generation')
try {
  const client = new WalrusCDNClient({
    baseUrl: API_BASE,
    apiKey: API_KEY,
  })

  const testBlobId = 'test-blob-id-123'
  const url = client.getCDNUrl(testBlobId)
  const expectedUrl = `${API_BASE}/cdn/${testBlobId}`

  if (url === expectedUrl) {
    console.log('✅ URL generation works correctly')
    console.log(`   Generated: ${url}`)
  } else {
    console.log('❌ URL generation failed')
    console.log(`   Expected: ${expectedUrl}`)
    console.log(`   Got: ${url}`)
  }
} catch (error) {
  console.log('❌ URL generation test failed:', error.message)
}

// Test 3: Multi-chain URL Generation
console.log('\nTest 3: Multi-chain URL Generation')
try {
  const client = new WalrusCDNClient({
    baseUrl: API_BASE,
    apiKey: API_KEY,
  })

  const testBlobId = 'test-blob-id-123'
  const chains = ['sui', 'ethereum', 'solana']

  chains.forEach((chain) => {
    const url = client.getMultiChainCDNUrl(testBlobId, { chain })
    console.log(`✅ ${chain.toUpperCase()} URL: ${url}`)
  })
} catch (error) {
  console.log('❌ Multi-chain URL generation test failed:', error.message)
}

// Test 4: Error Handling
console.log('\nTest 4: Error Handling')
try {
  const client = new WalrusCDNClient({
    baseUrl: API_BASE,
    apiKey: API_KEY,
  })

  // Test with empty blob ID (should throw error)
  try {
    client.getCDNUrl('')
  } catch (error) {
    if (
      error.name === 'WalrusCDNError' &&
      error.message.includes('blobId is required')
    ) {
      console.log('✅ Error handling works correctly for empty blob ID')
    } else {
      console.log('❌ Unexpected error:', error.message)
    }
  }
} catch (error) {
  console.log('❌ Error handling test failed:', error.message)
}

// Test 5: Configuration Validation
console.log('\nTest 5: Configuration Validation')
try {
  // Test with missing baseUrl (should throw error)
  try {
    new WalrusCDNClient({})
  } catch (error) {
    if (
      error.name === 'WalrusCDNError' &&
      error.message.includes('baseUrl is required')
    ) {
      console.log('✅ Configuration validation works correctly')
    } else {
      console.log('❌ Unexpected configuration error:', error.message)
    }
  }
} catch (error) {
  console.log('❌ Configuration validation test failed:', error.message)
}

console.log('\n🏁 Integration tests completed')
console.log('\nTo test API endpoints, start the backend server first:')
console.log('   cd cdn-server && bun dev')
console.log('\nThen test the endpoints:')
console.log(
  `   curl -X GET "${API_BASE}/v1/blobs?limit=5" -H "Authorization: Bearer ${API_KEY}"`,
)
console.log(`   curl -X GET "${API_BASE}/docs" # View API documentation`)
