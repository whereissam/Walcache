/**
 * Example usage of @walrus/cdn SDK
 * Run this example: node example.js
 */

import { getWalrusCDNUrl, WalrusCDNClient } from './dist/index.mjs';

// Configuration for your WCDN instance
const config = {
  baseUrl: 'http://localhost:4500', // Your WCDN server
  secure: false, // Use HTTP for local development
  // apiKey: 'your-api-key' // Optional for authenticated endpoints
};

async function main() {
  console.log('🦣 Walrus CDN SDK Example\n');

  // 1. Simple URL generation
  console.log('1. Simple URL Generation');
  console.log('========================');
  
  const blobId = 'sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0'; // Example blob ID
  const cdnUrl = getWalrusCDNUrl(blobId, config);
  console.log(`Blob ID: ${blobId}`);
  console.log(`CDN URL: ${cdnUrl}\n`);

  // 2. Using the full client
  console.log('2. Using Full Client');
  console.log('====================');
  
  const client = new WalrusCDNClient(config);

  try {
    // Check health
    const isHealthy = await client.healthCheck();
    console.log(`✅ CDN Health: ${isHealthy ? 'Healthy' : 'Down'}`);

    // Get CID information
    try {
      const cidInfo = await client.getCIDInfo(blobId);
      console.log(`📊 CID Info for ${blobId}:`);
      console.log(`   - Cached: ${cidInfo.cached}`);
      console.log(`   - Pinned: ${cidInfo.pinned}`);
      if (cidInfo.stats) {
        console.log(`   - Requests: ${cidInfo.stats.requests}`);
        console.log(`   - Hit Rate: ${(cidInfo.stats.hitRate * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.log(`ℹ️  CID not found in cache: ${blobId}`);
    }

    // Get global metrics
    try {
      const metrics = await client.getMetrics();
      console.log(`🌍 Global Metrics:`);
      console.log(`   - Total Requests: ${metrics.global.totalRequests}`);
      console.log(`   - Global Hit Rate: ${(metrics.global.globalHitRate * 100).toFixed(1)}%`);
      console.log(`   - Unique CIDs: ${metrics.global.uniqueCIDs}`);
      console.log(`   - Cache Backend: ${metrics.cache.using}`);
    } catch (error) {
      console.log(`⚠️  Could not fetch metrics: ${error.message}`);
    }

    // Example with multiple URLs
    console.log('\n3. Generating Multiple URLs');
    console.log('============================');
    
    const exampleBlobIds = [
      'sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0',
      'CKRa4G9UzZ9E56Nz0sGFN_RZhyqPToJAE3hPI6PtBVE',
      '-_GYacmE9AShLPWqK7u6ULRmDGu319JYmkgXWFyhHd8'
    ];

    exampleBlobIds.forEach((id, index) => {
      const url = client.getCDNUrl(id);
      console.log(`${index + 1}. ${url}`);
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log('\nMake sure your WCDN server is running on http://localhost:4500');
    console.log('You can start it with: cd cdn-server && npm run dev');
  }

  console.log('\n📚 More examples:');
  console.log('- Upload files: client.uploadFile(file, vaultId)');
  console.log('- Preload content: client.preloadCIDs([...blobIds])');
  console.log('- Pin content: client.pinCID(blobId)');
  console.log('- Clear cache: client.clearCache()');
}

main().catch(console.error);