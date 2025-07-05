/**
 * WCDN Multi-Chain SDK Example
 *
 * 🚀 One-line function to get CDN URLs for any supported blockchain
 */

import {
  getWalrusCDNUrl,
  getAvailableChains,
  getBlobStatus,
  isSupportedChain,
} from './src/index.js'

console.log('🌐 WCDN Multi-Chain SDK Demo')
console.log('================================')

// Example blob ID from a real Walrus upload
const blobId = 'XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0'

console.log('\n📋 Available Chains:')
const chains = getAvailableChains()
Object.entries(chains).forEach(([chain, config]) => {
  console.log(`  ${chain}: ${config.primary} (${config.status})`)
})

console.log('\n🔗 Multi-Chain CDN URLs:')

// Sui (default, active)
const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })
console.log(`  Sui:      ${suiUrl}`)

// Ethereum (mock for hackathon)
const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' })
console.log(`  Ethereum: ${ethUrl}`)

// Solana (mock for hackathon)
const solUrl = getWalrusCDNUrl(blobId, { chain: 'solana' })
console.log(`  Solana:   ${solUrl}`)

// Default (no chain specified = sui)
const defaultUrl = getWalrusCDNUrl(blobId)
console.log(`  Default:  ${defaultUrl}`)

// Custom endpoint
const customUrl = getWalrusCDNUrl(blobId, {
  customEndpoint: 'https://my-custom-aggregator.com',
})
console.log(`  Custom:   ${customUrl}`)

console.log('\n✅ Chain Support Check:')
console.log(`  sui supported:      ${isSupportedChain('sui')}`)
console.log(`  ethereum supported: ${isSupportedChain('ethereum')}`)
console.log(`  bitcoin supported:  ${isSupportedChain('bitcoin')}`)

console.log('\n📊 Multi-Chain Blob Status (Mock):')
getBlobStatus(blobId).then((status) => {
  console.log(`  Blob ID: ${status.blobId}`)
  console.log(`  Available on: ${status.summary.availableChains.join(', ')}`)
  console.log(`  Best chain: ${status.summary.bestChain}`)

  Object.entries(status.chains).forEach(([chain, info]) => {
    console.log(`  ${chain}: ${info.exists ? '✅' : '❌'} (${info.latency}ms)`)
  })
})

console.log('\n🎯 Hackathon Demo Features:')
console.log('  ✅ One-line multi-chain URL generation')
console.log('  ✅ Type-safe TypeScript interfaces')
console.log('  ✅ Extensible endpoint configuration')
console.log('  ✅ Mock multi-chain status (ready for real implementation)')
console.log('  ✅ Fallback endpoint support')
console.log('  ✅ Custom aggregator support')
