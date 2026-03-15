/**
 * Access gating service for NFT-gated and allowlist-based content access.
 * Verifies ownership on-chain before granting access to protected blobs.
 */

import axios from 'axios'
import { config } from '../config/index.js'

export type GateType = 'nft' | 'allowlist' | 'public'

export interface AccessGate {
  /** Unique gate ID */
  id: string
  /** CID(s) this gate protects */
  cids: Array<string>
  /** Gate type */
  type: GateType
  /** For NFT gates: contract address */
  contractAddress?: string
  /** For NFT gates: chain */
  chain?: 'sui' | 'ethereum'
  /** For NFT gates: minimum token count required */
  minTokens?: number
  /** For allowlist gates: allowed wallet addresses */
  allowlist?: Array<string>
  /** Creator of this gate */
  createdBy: string
  createdAt: string
}

export interface AccessCheckResult {
  granted: boolean
  reason: string
  gate?: AccessGate
}

export class AccessGateService {
  private gates = new Map<string, AccessGate>()
  /** CID → gate ID mapping for fast lookup */
  private cidToGate = new Map<string, string>()

  /**
   * Create an access gate for one or more CIDs.
   */
  createGate(
    gate: Omit<AccessGate, 'id' | 'createdAt'>,
  ): AccessGate {
    const id = `gate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const created: AccessGate = {
      ...gate,
      id,
      createdAt: new Date().toISOString(),
    }

    this.gates.set(id, created)
    for (const cid of created.cids) {
      this.cidToGate.set(cid, id)
    }

    return created
  }

  /**
   * Remove an access gate.
   */
  removeGate(gateId: string): boolean {
    const gate = this.gates.get(gateId)
    if (!gate) return false

    for (const cid of gate.cids) {
      this.cidToGate.delete(cid)
    }
    this.gates.delete(gateId)
    return true
  }

  /**
   * Get the gate protecting a CID (if any).
   */
  getGateForCid(cid: string): AccessGate | null {
    const gateId = this.cidToGate.get(cid)
    if (!gateId) return null
    return this.gates.get(gateId) || null
  }

  /**
   * List all gates.
   */
  listGates(): Array<AccessGate> {
    return Array.from(this.gates.values())
  }

  /**
   * Check if a wallet address has access to a gated CID.
   */
  async checkAccess(
    cid: string,
    walletAddress?: string,
  ): Promise<AccessCheckResult> {
    const gate = this.getGateForCid(cid)

    // No gate = public access
    if (!gate) {
      return { granted: true, reason: 'public' }
    }

    if (gate.type === 'public') {
      return { granted: true, reason: 'public_gate', gate }
    }

    if (!walletAddress) {
      return { granted: false, reason: 'wallet_required', gate }
    }

    if (gate.type === 'allowlist') {
      return this.checkAllowlist(gate, walletAddress)
    }

    if (gate.type === 'nft') {
      return this.checkNftOwnership(gate, walletAddress)
    }

    return { granted: false, reason: 'unknown_gate_type', gate }
  }

  /**
   * Check allowlist access.
   */
  private checkAllowlist(
    gate: AccessGate,
    walletAddress: string,
  ): AccessCheckResult {
    const allowed = gate.allowlist || []
    const normalized = walletAddress.toLowerCase()

    if (allowed.some((addr) => addr.toLowerCase() === normalized)) {
      return { granted: true, reason: 'allowlist_match', gate }
    }

    return { granted: false, reason: 'not_in_allowlist', gate }
  }

  /**
   * Check NFT ownership via on-chain query.
   * Supports Sui and Ethereum.
   */
  private async checkNftOwnership(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    if (!gate.contractAddress || !gate.chain) {
      return { granted: false, reason: 'gate_misconfigured', gate }
    }

    try {
      if (gate.chain === 'sui') {
        return await this.checkSuiNft(gate, walletAddress)
      }
      if (gate.chain === 'ethereum') {
        return await this.checkEthNft(gate, walletAddress)
      }
      return { granted: false, reason: 'unsupported_chain', gate }
    } catch (error) {
      console.warn(`NFT ownership check failed for ${gate.chain}:`, error)
      return { granted: false, reason: 'verification_error', gate }
    }
  }

  /**
   * Check Sui NFT ownership via Sui RPC.
   */
  private async checkSuiNft(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    const rpcUrl =
      config.WALRUS_NETWORK === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443'

    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getOwnedObjects',
      params: [
        walletAddress,
        {
          filter: {
            Package: gate.contractAddress,
          },
        },
        null,
        1, // Only need to find one
      ],
    })

    const objects = response.data?.result?.data || []
    const minTokens = gate.minTokens || 1

    if (objects.length >= minTokens) {
      return { granted: true, reason: 'nft_owner', gate }
    }

    return { granted: false, reason: 'nft_not_owned', gate }
  }

  /**
   * Check Ethereum NFT ownership via eth_call (ERC-721 balanceOf).
   */
  private async checkEthNft(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    const rpcUrl = 'https://eth.llamarpc.com'

    // ERC-721 balanceOf(address) selector: 0x70a08231
    const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0')
    const data = `0x70a08231${paddedAddress}`

    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        { to: gate.contractAddress, data },
        'latest',
      ],
    })

    const balance = parseInt(response.data?.result || '0x0', 16)
    const minTokens = gate.minTokens || 1

    if (balance >= minTokens) {
      return { granted: true, reason: 'nft_owner', gate }
    }

    return { granted: false, reason: 'nft_not_owned', gate }
  }

  /**
   * Add a wallet to an allowlist gate.
   */
  addToAllowlist(gateId: string, walletAddress: string): boolean {
    const gate = this.gates.get(gateId)
    if (!gate || gate.type !== 'allowlist') return false

    if (!gate.allowlist) gate.allowlist = []
    const normalized = walletAddress.toLowerCase()

    if (!gate.allowlist.some((a) => a.toLowerCase() === normalized)) {
      gate.allowlist.push(walletAddress)
    }
    return true
  }

  /**
   * Remove a wallet from an allowlist gate.
   */
  removeFromAllowlist(gateId: string, walletAddress: string): boolean {
    const gate = this.gates.get(gateId)
    if (!gate || gate.type !== 'allowlist' || !gate.allowlist) return false

    const normalized = walletAddress.toLowerCase()
    gate.allowlist = gate.allowlist.filter(
      (a) => a.toLowerCase() !== normalized,
    )
    return true
  }
}

export const accessGateService = new AccessGateService()
