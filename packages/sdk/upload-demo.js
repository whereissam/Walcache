#!/usr/bin/env node

/**
 * 🚀 WCDN Upload + Cache Demo
 * 
 * Shows the complete flow:
 * 1. Upload image to Walrus
 * 2. Automatic caching in WCDN
 * 3. Fast access from cache
 */

const { uploadToWalrusWithCache, getCacheStatus, getCachedContent } = require('./dist/index.js');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function colorLog(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadDemo() {
  console.clear();
  colorLog('cyan', '🚀 WCDN Upload + Cache Demo');
  colorLog('cyan', '=============================');
  console.log('');

  // Check if we can find a sample file
  const sampleFiles = ['package.json', 'README.md', 'demo.txt'];
  let testFile = null;
  
  for (const filename of sampleFiles) {
    if (fs.existsSync(filename)) {
      testFile = filename;
      break;
    }
  }

  if (!testFile) {
    // Create a sample file
    testFile = 'demo.txt';
    fs.writeFileSync(testFile, `WCDN Demo File
Created at: ${new Date().toISOString()}
This demonstrates upload to Walrus with automatic caching!

🚀 Benefits:
- One-click upload to decentralized storage
- Automatic caching for fast access
- Multi-chain support
- Web2-level performance with Web3 security
`);
    colorLog('blue', `✅ Created sample file: ${testFile}`);
  }

  const fileBuffer = fs.readFileSync(testFile);
  const file = new File([fileBuffer], testFile, { type: 'text/plain' });

  colorLog('yellow', `📁 File to upload: ${testFile} (${file.size} bytes)`);
  await sleep(1000);

  // Step 1: Upload with cache
  colorLog('blue', '\n📤 STEP 1: Upload to Walrus + Auto Cache');
  colorLog('blue', '=========================================');
  
  try {
    const uploadResult = await uploadToWalrusWithCache(file, {
      chain: 'sui',
      enableCache: true
    });

    if (uploadResult.success) {
      colorLog('green', `✅ Upload successful!`);
      console.log(`   Blob ID: ${uploadResult.blobId}`);
      console.log(`   CDN URL: ${uploadResult.cdnUrl}`);
      console.log(`   Direct URL: ${uploadResult.directUrl}`);
      console.log(`   Upload Time: ${uploadResult.uploadTime}ms`);
      console.log(`   Cached: ${uploadResult.cached ? 'Yes' : 'No'}`);
      if (uploadResult.suiRef) {
        console.log(`   Sui Reference: ${uploadResult.suiRef}`);
      }

      await sleep(2000);

      // Step 2: Check cache status
      colorLog('cyan', '\n📊 STEP 2: Check Cache Status');
      colorLog('cyan', '==============================');

      const cacheStatus = await getCacheStatus(uploadResult.blobId);
      if (cacheStatus) {
        colorLog('green', `✅ Cache status retrieved!`);
        console.log(`   Cached: ${cacheStatus.cached ? 'Yes' : 'No'}`);
        console.log(`   Hit Count: ${cacheStatus.hitCount}`);
        console.log(`   Last Access: ${cacheStatus.lastAccess}`);
        console.log(`   TTL: ${cacheStatus.ttl}s`);
        console.log(`   Size: ${cacheStatus.size} bytes`);
      } else {
        colorLog('yellow', '⚠️  Could not retrieve cache status');
      }

      await sleep(2000);

      // Step 3: Fast cached access
      colorLog('blue', '\n⚡ STEP 3: Fast Cached Access');
      colorLog('blue', '=============================');

      const cachedAccess = await getCachedContent(uploadResult.blobId, 'sui');
      colorLog('green', `✅ Content access ready!`);
      console.log(`   Access URL: ${cachedAccess.url}`);
      console.log(`   From Cache: ${cachedAccess.cached ? 'Yes' : 'No'}`);
      console.log(`   Access Latency: ${cachedAccess.latency}ms`);

      await sleep(1000);

      // Performance comparison
      colorLog('yellow', '\n📈 PERFORMANCE COMPARISON');
      colorLog('yellow', '=========================');
      
      console.log('   First Upload:     ', `${uploadResult.uploadTime}ms`);
      console.log('   Cached Access:    ', `${cachedAccess.latency}ms`);
      console.log('   Speed Improvement:', `${Math.round(uploadResult.uploadTime / cachedAccess.latency)}x faster!`);

    } else {
      colorLog('red', `❌ Upload failed: ${uploadResult.error}`);
    }

  } catch (error) {
    colorLog('red', `❌ Demo failed: ${error.message}`);
  }

  await sleep(1000);

  // Summary
  colorLog('green', '\n🎯 DEMO SUMMARY');
  colorLog('green', '===============');
  console.log('✅ One-click upload to Walrus with automatic caching');
  console.log('✅ Fast subsequent access from cache');
  console.log('✅ Multi-chain support (Sui, Ethereum, Solana)');
  console.log('✅ Web2-level performance with Web3 security');
  console.log('');
  colorLog('cyan', '💡 Integration Example:');
  console.log(`
const file = document.getElementById('fileInput').files[0];
const result = await uploadToWalrusWithCache(file, { chain: 'sui' });
console.log('Your file is now on Walrus:', result.cdnUrl);
`);
}

// Run the demo
if (require.main === module) {
  uploadDemo().catch(console.error);
}

module.exports = { uploadDemo };