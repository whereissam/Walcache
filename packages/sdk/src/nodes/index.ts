import type {
  SupportedChain,
  ChainNodeConfig,
  NodeSelectionResult,
} from '../types.js'

/**
 * Node selection strategies
 */
export type NodeSelectionStrategy = 'fastest' | 'closest' | 'cheapest' | 'random' | 'priority'

/**
 * Default node configurations for each supported chain
 */
export const DEFAULT_CHAIN_NODES: Record<SupportedChain, ChainNodeConfig[]> = {
  sui: [
    {
      url: 'https://fullnode.mainnet.sui.io:443',
      network: 'mainnet',
      priority: 1,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
    },
    {
      url: 'https://sui-mainnet.nodereal.io',
      network: 'mainnet',
      priority: 2,
      isAvailable: true,
      capabilities: ['rpc'],
    },
    {
      url: 'https://fullnode.testnet.sui.io:443',
      network: 'testnet',
      priority: 3,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
    },
  ],
  ethereum: [
    {
      url: 'https://ethereum.publicnode.com',
      network: 'mainnet',
      priority: 1,
      isAvailable: true,
      capabilities: ['rpc'],
      region: 'europe',
    },
    {
      url: 'https://eth-mainnet.alchemyapi.io/v2/demo',
      network: 'mainnet',
      priority: 2,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
      region: 'global',
    },
    {
      url: 'https://mainnet.infura.io/v3/demo',
      network: 'mainnet',
      priority: 3,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
      region: 'global',
    },
    {
      url: 'https://ethereum-sepolia-rpc.publicnode.com',
      network: 'testnet',
      priority: 1,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
      region: 'europe',
    },
    {
      url: 'https://sepolia.infura.io/v3/demo',
      network: 'testnet',
      priority: 2,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
      region: 'global',
    },
    {
      url: 'https://eth-sepolia.alchemyapi.io/v2/demo',
      network: 'testnet',
      priority: 3,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
      region: 'north-america',
    },
  ],
  solana: [
    {
      url: 'https://api.mainnet-beta.solana.com',
      network: 'mainnet',
      priority: 1,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
    },
    {
      url: 'https://solana-api.projectserum.com',
      network: 'mainnet',
      priority: 2,
      isAvailable: true,
      capabilities: ['rpc'],
    },
    {
      url: 'https://api.testnet.solana.com',
      network: 'testnet',
      priority: 1,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
    },
    {
      url: 'https://api.devnet.solana.com',
      network: 'devnet',
      priority: 2,
      isAvailable: true,
      capabilities: ['rpc', 'websocket'],
    },
  ],
}

/**
 * Node selection and optimization manager
 */
export class NodeManager {
  private nodes: Map<SupportedChain, ChainNodeConfig[]> = new Map()
  private latencyCache: Map<string, { latency: number; timestamp: number }> = new Map()
  private readonly LATENCY_CACHE_TTL = 300000 // 5 minutes

  constructor(customNodes?: Partial<Record<SupportedChain, ChainNodeConfig[]>>) {
    // Initialize with default nodes
    for (const [chain, nodes] of Object.entries(DEFAULT_CHAIN_NODES)) {
      this.nodes.set(chain as SupportedChain, [...nodes])
    }

    // Override with custom nodes if provided
    if (customNodes) {
      for (const [chain, nodes] of Object.entries(customNodes)) {
        if (nodes) {
          this.nodes.set(chain as SupportedChain, nodes)
        }
      }
    }
  }

  /**
   * Select the best node for a given chain using specified strategy
   */
  async selectNode(
    chain: SupportedChain,
    strategy: NodeSelectionStrategy = 'fastest',
    network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
  ): Promise<NodeSelectionResult> {
    const availableNodes = this.getAvailableNodes(chain, network)
    
    if (availableNodes.length === 0) {
      throw new Error(`No available nodes found for ${chain} on ${network}`)
    }

    let selectedNode: ChainNodeConfig
    let reason: string

    switch (strategy) {
      case 'fastest':
        selectedNode = await this.selectFastestNode(availableNodes)
        reason = 'Selected based on lowest latency'
        break

      case 'priority':
        selectedNode = this.selectByPriority(availableNodes)
        reason = 'Selected based on priority ranking'
        break

      case 'random':
        selectedNode = this.selectRandomNode(availableNodes)
        reason = 'Randomly selected for load distribution'
        break

      case 'closest':
        selectedNode = await this.selectClosestNode(availableNodes)
        reason = 'Selected based on geographic proximity'
        break

      case 'cheapest':
        selectedNode = this.selectCheapestNode(availableNodes)
        reason = 'Selected based on cost optimization'
        break

      default:
        selectedNode = availableNodes[0]
        reason = 'Default selection'
    }

    return {
      node: selectedNode,
      strategy,
      reason,
      alternatives: availableNodes.filter(n => n.url !== selectedNode.url),
    }
  }

  /**
   * Measure latency to a specific node
   */
  async measureLatency(node: ChainNodeConfig): Promise<number> {
    const cacheKey = node.url
    const cached = this.latencyCache.get(cacheKey)
    
    // Return cached latency if still valid
    if (cached && Date.now() - cached.timestamp < this.LATENCY_CACHE_TTL) {
      return cached.latency
    }

    try {
      const startTime = performance.now()
      
      // Make a lightweight request to measure latency
      const response = await fetch(node.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'web3_clientVersion', // or chain-specific health check
          params: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      const latency = performance.now() - startTime

      // Cache the result
      this.latencyCache.set(cacheKey, {
        latency,
        timestamp: Date.now(),
      })

      // Update node latency
      node.latency = latency
      node.isAvailable = response.ok

      return latency
    } catch (error) {
      // Mark node as unavailable on error
      node.isAvailable = false
      node.latency = Infinity
      return Infinity
    }
  }

  /**
   * Health check for all nodes of a specific chain
   */
  async healthCheckChain(chain: SupportedChain): Promise<void> {
    const nodes = this.nodes.get(chain) || []
    await Promise.all(nodes.map(node => this.measureLatency(node)))
  }

  /**
   * Get available nodes for a chain and network
   */
  private getAvailableNodes(
    chain: SupportedChain,
    network: 'mainnet' | 'testnet' | 'devnet',
  ): ChainNodeConfig[] {
    const chainNodes = this.nodes.get(chain) || []
    return chainNodes.filter(node => node.network === network && node.isAvailable)
  }

  /**
   * Select fastest node based on latency
   */
  private async selectFastestNode(nodes: ChainNodeConfig[]): Promise<ChainNodeConfig> {
    // Measure latency for all nodes
    await Promise.all(nodes.map(node => this.measureLatency(node)))
    
    // Sort by latency and return the fastest
    const sortedNodes = nodes
      .filter(node => node.isAvailable && node.latency !== undefined)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))

    if (sortedNodes.length === 0) {
      throw new Error('No responsive nodes available')
    }

    return sortedNodes[0]
  }

  /**
   * Select node by priority (lowest priority number = highest priority)
   */
  private selectByPriority(nodes: ChainNodeConfig[]): ChainNodeConfig {
    const sortedNodes = nodes.sort((a, b) => a.priority - b.priority)
    return sortedNodes[0]
  }

  /**
   * Select random node for load balancing
   */
  private selectRandomNode(nodes: ChainNodeConfig[]): ChainNodeConfig {
    const randomIndex = Math.floor(Math.random() * nodes.length)
    return nodes[randomIndex]
  }

  /**
   * Select closest node (simplified geographic selection)
   */
  private async selectClosestNode(nodes: ChainNodeConfig[]): Promise<ChainNodeConfig> {
    // Prefer European nodes for French users
    const europeanNodes = nodes.filter(node => node.region === 'europe')
    if (europeanNodes.length > 0) {
      return await this.selectFastestNode(europeanNodes)
    }
    
    // Fallback to global nodes, then fastest available
    const globalNodes = nodes.filter(node => node.region === 'global')
    if (globalNodes.length > 0) {
      return await this.selectFastestNode(globalNodes)
    }
    
    // Final fallback to any available node
    return await this.selectFastestNode(nodes)
  }

  /**
   * Select cheapest node (mock implementation)
   */
  private selectCheapestNode(nodes: ChainNodeConfig[]): ChainNodeConfig {
    // Mock implementation - in production, this would consider actual costs
    // For now, prefer public/free nodes over paid services
    const freeNodes = nodes.filter(node => 
      node.url.includes('publicnode.com') || 
      node.url.includes('mainnet.sui.io') ||
      node.url.includes('mainnet-beta.solana.com')
    )
    
    return freeNodes.length > 0 ? freeNodes[0] : nodes[0]
  }

  /**
   * Add custom node to a chain
   */
  addNode(chain: SupportedChain, node: ChainNodeConfig): void {
    const chainNodes = this.nodes.get(chain) || []
    chainNodes.push(node)
    this.nodes.set(chain, chainNodes)
  }

  /**
   * Remove node from a chain
   */
  removeNode(chain: SupportedChain, nodeUrl: string): void {
    const chainNodes = this.nodes.get(chain) || []
    const filteredNodes = chainNodes.filter(node => node.url !== nodeUrl)
    this.nodes.set(chain, filteredNodes)
  }

  /**
   * Get all nodes for a specific chain
   */
  getChainNodes(chain: SupportedChain): ChainNodeConfig[] {
    return this.nodes.get(chain) || []
  }

  /**
   * Clear latency cache
   */
  clearLatencyCache(): void {
    this.latencyCache.clear()
  }
}

// Export singleton instance
export const nodeManager = new NodeManager()

// Utility function for quick node selection
export async function getBestNode(
  chain: SupportedChain,
  strategy: NodeSelectionStrategy = 'fastest',
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
): Promise<string> {
  const result = await nodeManager.selectNode(chain, strategy, network)
  return result.node.url
}