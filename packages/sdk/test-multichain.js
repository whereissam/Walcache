/**
 * Test the new multi-chain SDK functionality
 */

const { 
  getWalrusCDNUrl, 
  getAvailableChains, 
  getBlobStatus,
  isSupportedChain 
} = require('./dist/index.js');

console.log('🌐 WCDN Multi-Chain SDK Test');
console.log('=============================');

// Example blob ID from a real Walrus upload
const blobId = 'XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0';

console.log('\n📋 Available Chains:');
const chains = getAvailableChains();
Object.entries(chains).forEach(([chain, config]) => {
  console.log(`  ${chain}: ${config.primary} (${config.status})`);
});

console.log('\n🔗 Multi-Chain CDN URLs:');

// Test all supported chains
try {
  // Sui (default, active)
  const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' });
  console.log(`  ✅ Sui:      ${suiUrl}`);

  // Ethereum (mock for hackathon)
  const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' });
  console.log(`  ✅ Ethereum: ${ethUrl}`);

  // Solana (mock for hackathon)
  const solUrl = getWalrusCDNUrl(blobId, { chain: 'solana' });
  console.log(`  ✅ Solana:   ${solUrl}`);

  // Default (no chain specified = sui)
  const defaultUrl = getWalrusCDNUrl(blobId);
  console.log(`  ✅ Default:  ${defaultUrl}`);

  // Custom endpoint
  const customUrl = getWalrusCDNUrl(blobId, { 
    customEndpoint: 'https://my-custom-aggregator.com' 
  });
  console.log(`  ✅ Custom:   ${customUrl}`);

} catch (error) {
  console.error('❌ Error generating URLs:', error.message);
}

console.log('\n✅ Chain Support Check:');
console.log(`  sui supported:      ${isSupportedChain('sui')}`);
console.log(`  ethereum supported: ${isSupportedChain('ethereum')}`);
console.log(`  bitcoin supported:  ${isSupportedChain('bitcoin')}`);

console.log('\n📊 Multi-Chain Blob Status (Mock):');
getBlobStatus(blobId).then(status => {
  console.log(`  Blob ID: ${status.blobId}`);
  console.log(`  Available on: ${status.summary.availableChains.join(', ')}`);
  console.log(`  Best chain: ${status.summary.bestChain}`);
  
  Object.entries(status.chains).forEach(([chain, info]) => {
    console.log(`  ${chain}: ${info.exists ? '✅' : '❌'} (${info.latency}ms)`);
  });
}).catch(error => {
  console.error('❌ Error getting blob status:', error.message);
});

console.log('\n🎯 Hackathon Demo Features:');
console.log('  ✅ One-line multi-chain URL generation');
console.log('  ✅ Type-safe TypeScript interfaces');
console.log('  ✅ Extensible endpoint configuration');
console.log('  ✅ Mock multi-chain status (ready for real implementation)');
console.log('  ✅ Fallback endpoint support');
console.log('  ✅ Custom aggregator support');

console.log('\n🚀 Usage Example:');
console.log('```javascript');
console.log("import { getWalrusCDNUrl } from 'wcdn-sdk';");
console.log('');
console.log("const suiUrl = getWalrusCDNUrl('your-blob-id', { chain: 'sui' });");
console.log("const ethUrl = getWalrusCDNUrl('your-blob-id', { chain: 'ethereum' });");
console.log("const solUrl = getWalrusCDNUrl('your-blob-id', { chain: 'solana' });");
console.log('```');