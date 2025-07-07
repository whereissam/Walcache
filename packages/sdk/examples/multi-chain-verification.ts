/**
 * Multi-chain Asset Verification Examples
 *
 * This example demonstrates how to use the WCDN SDK's multi-chain verification
 * capabilities with Ethereum Sepolia testnet, Sui, and Solana networks.
 */

import {
  WalrusCDNClient,
  getWalrusCDNUrl,
  getAdvancedWalrusCDNUrl,
  verifyAsset,
  verifyMultiChain,
  selectOptimalNode,
  EthereumVerifier,
  SuiVerifier,
  SolanaVerifier,
  type AssetVerificationOptions,
  type SupportedChain,
} from '../src/index.js'

// Example configuration for different networks
const EXAMPLE_CONFIG = {
  ethereum: {
    sepolia: {
      rpcUrl: 'https://sepolia.infura.io/v3/demo',
      contractAddress: '0x1234567890123456789012345678901234567890', // Example NFT contract
      userAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      tokenId: '123',
    },
  },
  sui: {
    testnet: {
      rpcUrl: 'https://fullnode.testnet.sui.io:443',
      userAddress: '0x1234567890abcdef1234567890abcdef12345678',
      objectId:
        '0xabcdef123456789012345678901234567890abcdef123456789012345678901234',
    },
  },
  solana: {
    testnet: {
      rpcUrl: 'https://api.testnet.solana.com',
      userAddress: '5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf',
      mintAddress: 'GqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf7J4QqZ5J7XKqbJbzKf',
    },
  },
}

/**
 * Example 1: Basic multi-chain URL generation
 */
async function basicMultiChainExample() {
  console.log('🚀 Basic Multi-Chain URL Generation Example')
  console.log('='.repeat(50))

  const blobId = 'bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw'

  // Generate URLs for different chains
  const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })
  const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' })
  const solanaUrl = getWalrusCDNUrl(blobId, { chain: 'solana' })

  console.log('Sui URL:', suiUrl)
  console.log('Ethereum URL:', ethUrl)
  console.log('Solana URL:', solanaUrl)
  console.log()
}

/**
 * Example 2: Ethereum Sepolia testnet verification
 */
async function ethereumSepoliaExample() {
  console.log('🔐 Ethereum Sepolia Testnet Verification Example')
  console.log('='.repeat(50))

  const config = EXAMPLE_CONFIG.ethereum.sepolia

  // Initialize Ethereum verifier with Sepolia testnet
  const ethVerifier = new EthereumVerifier(config.rpcUrl, 'sepolia')

  const verificationOptions: AssetVerificationOptions = {
    userAddress: config.userAddress,
    assetId: config.tokenId,
    contractAddress: config.contractAddress,
    metadata: {
      network: 'sepolia',
      description: 'Example NFT on Sepolia testnet',
    },
  }

  try {
    console.log('Verifying asset ownership on Sepolia...')
    console.log('User Address:', config.userAddress)
    console.log('Contract Address:', config.contractAddress)
    console.log('Token ID:', config.tokenId)
    console.log()

    const result = await ethVerifier.verifyAsset(verificationOptions)

    console.log('Verification Result:')
    console.log('- Has Access:', result.hasAccess)
    console.log('- Chain:', result.chain)
    console.log('- Verified At:', result.verifiedAt.toISOString())

    if (result.assetMetadata) {
      console.log('- Asset Name:', result.assetMetadata.name)
      console.log('- Asset Description:', result.assetMetadata.description)
    }

    if (result.error) {
      console.log('- Error:', result.error)
    }
  } catch (error) {
    console.error('Verification failed:', error)
  }

  console.log()
}

/**
 * Example 3: Multi-chain verification comparison
 */
async function multiChainComparisonExample() {
  console.log('🌐 Multi-Chain Verification Comparison Example')
  console.log('='.repeat(50))

  const client = new WalrusCDNClient({
    baseUrl: 'https://your-cdn-domain.com',
  })

  // Test different chains with same user concept
  const chains: SupportedChain[] = ['ethereum', 'sui', 'solana']

  const verificationOptions: AssetVerificationOptions = {
    userAddress: '0x1234567890abcdef1234567890abcdef12345678',
    assetId: '12345',
    contractAddress: '0x1234567890123456789012345678901234567890',
    metadata: {
      description: 'Cross-chain asset verification test',
    },
  }

  try {
    console.log('Running multi-chain verification...')
    const multiChainResult = await client.verifyMultiChain(
      chains,
      verificationOptions,
    )

    console.log('Multi-Chain Results:')
    console.log('- Has Access (Any Chain):', multiChainResult.hasAccess)
    console.log('- Primary Chain:', multiChainResult.primary.chain)
    console.log('- Primary Has Access:', multiChainResult.primary.hasAccess)

    console.log('\nPer-Chain Results:')
    chains.forEach((chain) => {
      const chainResult = multiChainResult.crossChain[chain]
      console.log(
        `- ${chain.toUpperCase()}:`,
        chainResult.hasAccess ? '✅ Verified' : '❌ Not verified',
      )
      if (chainResult.error) {
        console.log(`  Error: ${chainResult.error}`)
      }
    })

    if (multiChainResult.recommendedEndpoint) {
      console.log(
        '\nRecommended Endpoint:',
        multiChainResult.recommendedEndpoint,
      )
    }
  } catch (error) {
    console.error('Multi-chain verification failed:', error)
  }

  console.log()
}

/**
 * Example 4: Advanced CDN URL with verification
 */
async function advancedCDNExample() {
  console.log('⚡ Advanced CDN URL with Verification Example')
  console.log('='.repeat(50))

  const blobId = 'bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw'

  try {
    // Generate advanced CDN URL with Ethereum Sepolia verification
    const advancedResult = await getAdvancedWalrusCDNUrl(blobId, {
      baseUrl: 'https://your-cdn-domain.com',
      chain: 'ethereum',
      verification: {
        userAddress: EXAMPLE_CONFIG.ethereum.sepolia.userAddress,
        assetId: EXAMPLE_CONFIG.ethereum.sepolia.tokenId,
        contractAddress: EXAMPLE_CONFIG.ethereum.sepolia.contractAddress,
      },
      nodeSelectionStrategy: 'fastest',
    })

    console.log('Advanced CDN Result:')
    console.log('- Optimized URL:', advancedResult.url)

    if (advancedResult.verification) {
      console.log(
        '- Verification Status:',
        advancedResult.verification.hasAccess ? '✅ Verified' : '❌ Failed',
      )
      console.log('- Verification Chain:', advancedResult.verification.chain)
    }

    if (advancedResult.nodeSelection) {
      console.log('- Selected Node:', advancedResult.nodeSelection.node.url)
      console.log(
        '- Selection Strategy:',
        advancedResult.nodeSelection.strategy,
      )
      console.log('- Selection Reason:', advancedResult.nodeSelection.reason)
    }
  } catch (error) {
    console.error('Advanced CDN generation failed:', error)
  }

  console.log()
}

/**
 * Example 5: Node selection optimization
 */
async function nodeOptimizationExample() {
  console.log('🎯 Node Selection Optimization Example')
  console.log('='.repeat(50))

  const chains: SupportedChain[] = ['ethereum', 'sui', 'solana']

  for (const chain of chains) {
    console.log(`\nOptimizing nodes for ${chain.toUpperCase()}:`)

    try {
      // Test different selection strategies
      const strategies = ['fastest', 'priority', 'random'] as const

      for (const strategy of strategies) {
        const network = chain === 'ethereum' ? 'testnet' : 'mainnet' // Use testnet for Ethereum (Sepolia)
        const result = await selectOptimalNode(chain, strategy, network)

        console.log(`  ${strategy.toUpperCase()} strategy:`)
        console.log(`    - Selected: ${result.node.url}`)
        console.log(`    - Network: ${result.node.network}`)
        console.log(`    - Reason: ${result.reason}`)
        console.log(`    - Alternatives: ${result.alternatives.length}`)
      }
    } catch (error) {
      console.error(`  Error optimizing ${chain}:`, error)
    }
  }

  console.log()
}

/**
 * Example 6: Full workflow demonstration
 */
async function fullWorkflowExample() {
  console.log('🔄 Full Multi-Chain Workflow Example')
  console.log('='.repeat(50))

  const blobId = 'bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw'

  console.log('Step 1: Verify user owns NFT on Ethereum Sepolia...')
  const ethVerificationResult = await verifyAsset('ethereum', {
    userAddress: EXAMPLE_CONFIG.ethereum.sepolia.userAddress,
    assetId: EXAMPLE_CONFIG.ethereum.sepolia.tokenId,
    contractAddress: EXAMPLE_CONFIG.ethereum.sepolia.contractAddress,
  })

  console.log(
    '- Ethereum verification:',
    ethVerificationResult.hasAccess ? '✅ Verified' : '❌ Failed',
  )

  if (ethVerificationResult.hasAccess) {
    console.log('\nStep 2: Generate optimized CDN URL...')
    const advancedUrl = await getAdvancedWalrusCDNUrl(blobId, {
      baseUrl: 'https://your-cdn-domain.com',
      chain: 'ethereum',
      verification: {
        userAddress: EXAMPLE_CONFIG.ethereum.sepolia.userAddress,
        assetId: EXAMPLE_CONFIG.ethereum.sepolia.tokenId,
        contractAddress: EXAMPLE_CONFIG.ethereum.sepolia.contractAddress,
      },
      nodeSelectionStrategy: 'fastest',
    })

    console.log('- Optimized CDN URL:', advancedUrl.url)
    console.log('- Ready for secure content delivery! 🚀')
  } else {
    console.log('- User verification failed, access denied ❌')
  }

  console.log()
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🎯 WCDN Multi-Chain Verification Examples')
  console.log('='.repeat(50))
  console.log('These examples demonstrate multi-chain asset verification')
  console.log('with special focus on Ethereum Sepolia testnet support.')
  console.log()

  await basicMultiChainExample()
  await ethereumSepoliaExample()
  await multiChainComparisonExample()
  await advancedCDNExample()
  await nodeOptimizationExample()
  await fullWorkflowExample()

  console.log('🎉 All examples completed!')
  console.log('✨ Ready to implement multi-chain verification in your app!')
}

// Export for use in tests or other modules
export {
  basicMultiChainExample,
  ethereumSepoliaExample,
  multiChainComparisonExample,
  advancedCDNExample,
  nodeOptimizationExample,
  fullWorkflowExample,
  runAllExamples,
  EXAMPLE_CONFIG,
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error)
}
