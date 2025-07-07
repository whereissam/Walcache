import type {
  SupportedChain,
  AssetQueryOptions,
  AssetQueryResult,
} from '../types.js'
import { nodeManager } from '../nodes/index.js'

/**
 * Smart contract query interface for different blockchain networks
 */
export interface ContractQueryEngine {
  /** Target blockchain */
  chain: SupportedChain
  /** Query asset information from smart contracts */
  queryAsset(options: AssetQueryOptions): Promise<AssetQueryResult>
  /** Query multiple assets in batch */
  batchQueryAssets(options: AssetQueryOptions[]): Promise<AssetQueryResult[]>
  /** Check if query engine is properly configured */
  isConfigured(): boolean
}

/**
 * Sui contract query engine for querying Sui objects and packages
 */
export class SuiQueryEngine implements ContractQueryEngine {
  chain: SupportedChain = 'sui'
  private network: 'mainnet' | 'testnet' | 'devnet'

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet') {
    this.network = network
  }

  async queryAsset(options: AssetQueryOptions): Promise<AssetQueryResult> {
    try {
      const nodeUrl = await this.getOptimalNode()
      return await this.querySuiObject(nodeUrl, options)
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }

  async batchQueryAssets(
    options: AssetQueryOptions[],
  ): Promise<AssetQueryResult[]> {
    const nodeUrl = await this.getOptimalNode()
    return Promise.all(
      options.map((option) => this.querySuiObject(nodeUrl, option)),
    )
  }

  isConfigured(): boolean {
    return true // Always configured with default nodes
  }

  private async getOptimalNode(): Promise<string> {
    const result = await nodeManager.selectNode(
      this.chain,
      'fastest',
      this.network,
    )
    return result.node.url
  }

  private async querySuiObject(
    nodeUrl: string,
    options: AssetQueryOptions,
  ): Promise<AssetQueryResult> {
    try {
      // Mock Sui RPC call - in production, use @mysten/sui.js
      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'sui_getObject',
          params: [
            options.assetId,
            {
              showType: true,
              showOwner: true,
              showPreviousTransaction: true,
              showDisplay: true,
              showContent: true,
              showBcs: false,
              showStorageRebate: false,
            },
          ],
          id: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Sui RPC call failed: ${response.status}`)
      }

      const data = await response.json()

      // Mock successful response
      const exists = Math.random() > 0.2 // 80% success rate

      return {
        exists,
        owner: exists
          ? data.result?.data?.owner?.AddressOwner || 'Sui Address...'
          : undefined,
        metadata: exists
          ? {
              name: `Sui Object ${options.assetId.slice(0, 8)}`,
              description: 'Sui blockchain object',
              objectType: data.result?.data?.type || 'unknown',
              version: data.result?.data?.version || '1',
              digest: data.result?.data?.digest || 'digest...',
            }
          : undefined,
        contentHashes: exists ? [`walrus_${options.assetId}`] : undefined,
        queriedAt: new Date(),
      }
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }
}

/**
 * Ethereum contract query engine for ERC-721/ERC-1155 and custom contracts
 */
export class EthereumQueryEngine implements ContractQueryEngine {
  chain: SupportedChain = 'ethereum'
  private network: 'mainnet' | 'testnet'

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = network
  }

  async queryAsset(options: AssetQueryOptions): Promise<AssetQueryResult> {
    try {
      const nodeUrl = await this.getOptimalNode()
      return await this.queryEthereumContract(nodeUrl, options)
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }

  async batchQueryAssets(
    options: AssetQueryOptions[],
  ): Promise<AssetQueryResult[]> {
    const nodeUrl = await this.getOptimalNode()
    return Promise.all(
      options.map((option) => this.queryEthereumContract(nodeUrl, option)),
    )
  }

  isConfigured(): boolean {
    return true
  }

  private async getOptimalNode(): Promise<string> {
    const result = await nodeManager.selectNode(
      this.chain,
      'fastest',
      this.network,
    )
    return result.node.url
  }

  private async queryEthereumContract(
    nodeUrl: string,
    options: AssetQueryOptions,
  ): Promise<AssetQueryResult> {
    try {
      // Mock Ethereum JSON-RPC calls
      // In production, use ethers.js for proper contract interaction

      // First, check if token exists by calling ownerOf or balanceOf
      const ownerOfCall = await this.makeEthRpcCall(nodeUrl, 'eth_call', [
        {
          to: options.contractAddress,
          data: this.encodeOwnerOfCall(options.assetId), // ERC-721 ownerOf(tokenId)
        },
        'latest',
      ])

      if (!ownerOfCall || ownerOfCall === '0x') {
        return {
          exists: false,
          queriedAt: new Date(),
          error: 'Token does not exist or contract call failed',
        }
      }

      // Decode owner address from response
      const owner = this.decodeAddress(ownerOfCall)

      // Try to get tokenURI
      const tokenURICall = await this.makeEthRpcCall(nodeUrl, 'eth_call', [
        {
          to: options.contractAddress,
          data: this.encodeTokenURICall(options.assetId),
        },
        'latest',
      ])

      const tokenURI = this.decodeString(tokenURICall)

      // Fetch metadata from tokenURI if available
      let metadata: any = {
        name: `Ethereum NFT #${options.assetId}`,
        description: `ERC-721 token on ${this.network}`,
        contractAddress: options.contractAddress,
        network: this.network,
      }

      if (tokenURI && tokenURI.startsWith('http')) {
        try {
          const metadataResponse = await fetch(tokenURI, {
            signal: AbortSignal.timeout(5000),
          })
          if (metadataResponse.ok) {
            const fetchedMetadata = await metadataResponse.json()
            metadata = { ...metadata, ...fetchedMetadata }
          }
        } catch (error) {
          // Ignore metadata fetch errors
        }
      }

      return {
        exists: true,
        owner,
        metadata: {
          ...metadata,
          tokenURI,
        },
        contentHashes: [`ipfs_${options.assetId}`, `walrus_${options.assetId}`],
        queriedAt: new Date(),
      }
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }

  private async makeEthRpcCall(
    nodeUrl: string,
    method: string,
    params: any[],
  ): Promise<string | null> {
    try {
      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Ethereum RPC call failed: ${response.status}`)
      }

      const data = await response.json()
      return data.result || null
    } catch (error) {
      console.warn('Ethereum RPC call failed:', error)
      return null
    }
  }

  private encodeOwnerOfCall(tokenId: string): string {
    // Encode ERC-721 ownerOf(uint256) call
    // Function selector: 0x6352211e
    const functionSelector = '6352211e'
    const paddedTokenId = tokenId.padStart(64, '0')
    return `0x${functionSelector}${paddedTokenId}`
  }

  private encodeTokenURICall(tokenId: string): string {
    // Encode ERC-721 tokenURI(uint256) call
    // Function selector: 0xc87b56dd
    const functionSelector = 'c87b56dd'
    const paddedTokenId = tokenId.padStart(64, '0')
    return `0x${functionSelector}${paddedTokenId}`
  }

  private decodeAddress(hexData: string): string {
    if (!hexData || hexData.length < 66) return ''
    // Extract address from last 40 characters (20 bytes)
    return `0x${hexData.slice(-40)}`
  }

  private decodeString(hexData: string): string {
    if (!hexData || hexData === '0x') return ''
    try {
      // Simple string decoding - in production, use proper ABI decoding
      const hex = hexData.slice(2)
      const str = Buffer.from(hex, 'hex').toString('utf8')
      return str.replace(/\0/g, '').trim()
    } catch (error) {
      return ''
    }
  }
}

/**
 * Solana query engine for SPL tokens and NFTs
 */
export class SolanaQueryEngine implements ContractQueryEngine {
  chain: SupportedChain = 'solana'
  private network: 'mainnet' | 'testnet' | 'devnet'

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet') {
    this.network =
      network === 'testnet'
        ? 'testnet'
        : network === 'devnet'
          ? 'devnet'
          : 'mainnet'
  }

  async queryAsset(options: AssetQueryOptions): Promise<AssetQueryResult> {
    try {
      const nodeUrl = await this.getOptimalNode()
      return await this.querySolanaToken(nodeUrl, options)
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }

  async batchQueryAssets(
    options: AssetQueryOptions[],
  ): Promise<AssetQueryResult[]> {
    const nodeUrl = await this.getOptimalNode()
    return Promise.all(
      options.map((option) => this.querySolanaToken(nodeUrl, option)),
    )
  }

  isConfigured(): boolean {
    return true
  }

  private async getOptimalNode(): Promise<string> {
    const networkMap: Record<string, 'mainnet' | 'testnet' | 'devnet'> = {
      mainnet: 'mainnet',
      testnet: 'testnet',
      devnet: 'devnet',
    }
    const result = await nodeManager.selectNode(
      this.chain,
      'fastest',
      networkMap[this.network],
    )
    return result.node.url
  }

  private async querySolanaToken(
    nodeUrl: string,
    options: AssetQueryOptions,
  ): Promise<AssetQueryResult> {
    try {
      // Mock Solana RPC call - in production, use @solana/web3.js
      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getAccountInfo',
          params: [
            options.assetId,
            {
              encoding: 'jsonParsed',
            },
          ],
          id: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Solana RPC call failed: ${response.status}`)
      }

      const data = await response.json()

      // Mock successful response
      const exists = Math.random() > 0.25 // 75% success rate

      return {
        exists,
        owner: exists
          ? options.contractAddress ||
            data.result?.value?.owner ||
            'Solana Address...'
          : undefined,
        metadata: exists
          ? {
              name: `Solana Token ${options.assetId.slice(0, 8)}`,
              description: `SPL token on ${this.network}`,
              mint: options.assetId,
              network: this.network,
              tokenProgram: data.result?.value?.owner || 'Token Program',
            }
          : undefined,
        contentHashes: exists
          ? [`arweave_${options.assetId}`, `walrus_${options.assetId}`]
          : undefined,
        queriedAt: new Date(),
      }
    } catch (error) {
      return {
        exists: false,
        queriedAt: new Date(),
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }
}

/**
 * Multi-chain query manager
 */
export class QueryManager {
  private engines: Map<SupportedChain, ContractQueryEngine> = new Map()

  constructor() {
    // Initialize default query engines
    this.registerEngine(new SuiQueryEngine())
    this.registerEngine(new EthereumQueryEngine())
    this.registerEngine(new SolanaQueryEngine())
  }

  registerEngine(engine: ContractQueryEngine): void {
    this.engines.set(engine.chain, engine)
  }

  getEngine(chain: SupportedChain): ContractQueryEngine | undefined {
    return this.engines.get(chain)
  }

  async queryAsset(
    chain: SupportedChain,
    options: AssetQueryOptions,
  ): Promise<AssetQueryResult> {
    const engine = this.getEngine(chain)
    if (!engine) {
      throw new Error(`No query engine registered for chain: ${chain}`)
    }

    if (!engine.isConfigured()) {
      throw new Error(`Query engine for ${chain} is not properly configured`)
    }

    return await engine.queryAsset(options)
  }

  async batchQueryAssets(
    chain: SupportedChain,
    options: AssetQueryOptions[],
  ): Promise<AssetQueryResult[]> {
    const engine = this.getEngine(chain)
    if (!engine) {
      throw new Error(`No query engine registered for chain: ${chain}`)
    }

    return await engine.batchQueryAssets(options)
  }

  async queryMultiChain(
    chains: SupportedChain[],
    options: AssetQueryOptions,
  ): Promise<Record<SupportedChain, AssetQueryResult>> {
    const results: Partial<Record<SupportedChain, AssetQueryResult>> = {}

    await Promise.all(
      chains.map(async (chain) => {
        try {
          results[chain] = await this.queryAsset(chain, { ...options, chain })
        } catch (error) {
          results[chain] = {
            exists: false,
            queriedAt: new Date(),
            error: error instanceof Error ? error.message : 'Query failed',
          }
        }
      }),
    )

    return results as Record<SupportedChain, AssetQueryResult>
  }

  getSupportedChains(): SupportedChain[] {
    return Array.from(this.engines.keys())
  }
}

// Export singleton instance
export const queryManager = new QueryManager()

// Classes are already exported above with 'export class'
