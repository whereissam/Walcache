/**
 * Access gating service for NFT-gated and allowlist-based content access.
 * Verifies ownership on-chain before granting access to protected blobs.
 * Persisted to SQLite via Drizzle ORM.
 *
 * Request flow:
 *   Client → checkAccess(cid, wallet)
 *     → getGateForCid(cid) [DB lookup]
 *     → IF nft: checkNftOwnership → RPC call (with retry + circuit breaker)
 *     → IF allowlist: checkAllowlist [in-memory comparison]
 *     → return { granted, reason }
 */

import crypto from 'node:crypto'
import axios from 'axios'
import { eq } from 'drizzle-orm'
import { config } from '../config/index.js'
import { db, schema } from '../db/index.js'

/** Circuit breaker state for RPC calls */
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  isOpen: boolean
}

const RPC_TIMEOUT = 10_000 // 10s
const RPC_MAX_RETRIES = 3
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_RESET_MS = 60_000 // 60s

export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

export type GateType = 'nft' | 'allowlist' | 'public'

export interface AccessGate {
  id: string
  cids: Array<string>
  type: GateType
  contractAddress?: string
  chain?: 'sui' | 'ethereum'
  minTokens?: number
  allowlist?: Array<string>
  createdBy: string
  createdAt: string
}

export interface AccessCheckResult {
  granted: boolean
  reason: string
  gate?: AccessGate
}

function rowToGate(row: typeof schema.accessGates.$inferSelect): AccessGate {
  return {
    id: row.id,
    cids: row.cids as string[],
    type: row.type as GateType,
    contractAddress: row.contractAddress || undefined,
    chain: (row.chain as 'sui' | 'ethereum') || undefined,
    minTokens: row.minTokens || undefined,
    allowlist: (row.allowlist as string[]) || undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

export class AccessGateService {
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  }

  createGate(gate: Omit<AccessGate, 'id' | 'createdAt'>): AccessGate {
    const id = `gate_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    // Atomic: gate + CID mappings in a single transaction
    db.transaction((tx) => {
      tx.insert(schema.accessGates)
        .values({
          id,
          cids: gate.cids,
          type: gate.type,
          contractAddress: gate.contractAddress,
          chain: gate.chain,
          minTokens: gate.minTokens,
          allowlist: gate.allowlist,
          createdBy: gate.createdBy,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      for (const cid of gate.cids) {
        tx.insert(schema.cidGateMapping)
          .values({ cid, gateId: id, createdAt: now })
          .onConflictDoUpdate({
            target: schema.cidGateMapping.cid,
            set: { gateId: id, createdAt: now },
          })
          .run()
      }
    })

    return { ...gate, id, createdAt: now }
  }

  removeGate(gateId: string): boolean {
    const gate = db
      .select()
      .from(schema.accessGates)
      .where(eq(schema.accessGates.id, gateId))
      .get()

    if (!gate) return false

    // CID mappings cascade-deleted via FK
    db.delete(schema.accessGates)
      .where(eq(schema.accessGates.id, gateId))
      .run()

    return true
  }

  getGateForCid(cid: string): AccessGate | null {
    const mapping = db
      .select()
      .from(schema.cidGateMapping)
      .where(eq(schema.cidGateMapping.cid, cid))
      .get()

    if (!mapping) return null

    const gate = db
      .select()
      .from(schema.accessGates)
      .where(eq(schema.accessGates.id, mapping.gateId))
      .get()

    return gate ? rowToGate(gate) : null
  }

  listGates(): Array<AccessGate> {
    const rows = db.select().from(schema.accessGates).all()
    return rows.map(rowToGate)
  }

  async checkAccess(
    cid: string,
    walletAddress?: string,
  ): Promise<AccessCheckResult> {
    const gate = this.getGateForCid(cid)

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

  private async checkNftOwnership(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    if (!gate.contractAddress || !gate.chain) {
      return { granted: false, reason: 'gate_misconfigured', gate }
    }

    // Circuit breaker: if open, skip RPC and return service_unavailable
    if (this.isCircuitOpen()) {
      return { granted: false, reason: 'service_unavailable', gate }
    }

    try {
      let result: AccessCheckResult
      if (gate.chain === 'sui') {
        result = await this.checkSuiNft(gate, walletAddress)
      } else if (gate.chain === 'ethereum') {
        result = await this.checkEthNft(gate, walletAddress)
      } else {
        return { granted: false, reason: 'unsupported_chain', gate }
      }

      // Success resets circuit breaker
      this.circuitBreaker.failures = 0
      this.circuitBreaker.isOpen = false
      return result
    } catch (error) {
      this.recordRpcFailure()
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`NFT ownership check failed for ${gate.chain}: ${msg}`)

      if (error instanceof RpcError) {
        return { granted: false, reason: `rpc_error: ${error.message}`, gate }
      }
      return { granted: false, reason: 'service_unavailable', gate }
    }
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) return false
    // Auto-reset after cooldown
    if (Date.now() - this.circuitBreaker.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      this.circuitBreaker.isOpen = false
      this.circuitBreaker.failures = 0
      return false
    }
    return true
  }

  private recordRpcFailure(): void {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailure = Date.now()
    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.isOpen = true
    }
  }

  /** Retry an async operation with exponential backoff */
  private async withRetry<T>(fn: () => Promise<T>, retries = RPC_MAX_RETRIES): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }
    throw lastError
  }

  /** Validate JSON-RPC response and throw RpcError on errors */
  private validateRpcResponse(data: any): void {
    if (data?.error) {
      throw new RpcError(
        data.error.code || -1,
        data.error.message || 'Unknown RPC error',
      )
    }
    if (!data?.result && data?.result !== 0) {
      throw new RpcError(-1, 'Missing result in RPC response')
    }
  }

  private async checkSuiNft(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    const rpcUrl =
      config.WALRUS_NETWORK === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443'

    const response = await this.withRetry(() =>
      axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_getOwnedObjects',
          params: [
            walletAddress,
            { filter: { Package: gate.contractAddress } },
            null,
            1,
          ],
        },
        { timeout: RPC_TIMEOUT },
      ),
    )

    this.validateRpcResponse(response.data)

    const objects = response.data.result?.data || []
    const minTokens = gate.minTokens || 1

    if (objects.length >= minTokens) {
      return { granted: true, reason: 'nft_owner', gate }
    }

    return { granted: false, reason: 'nft_not_owned', gate }
  }

  private async checkEthNft(
    gate: AccessGate,
    walletAddress: string,
  ): Promise<AccessCheckResult> {
    const rpcUrl = 'https://eth.llamarpc.com'
    const paddedAddress = walletAddress
      .toLowerCase()
      .replace('0x', '')
      .padStart(64, '0')
    const data = `0x70a08231${paddedAddress}`

    const response = await this.withRetry(() =>
      axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: gate.contractAddress, data }, 'latest'],
        },
        { timeout: RPC_TIMEOUT },
      ),
    )

    this.validateRpcResponse(response.data)

    const balance = parseInt(response.data.result || '0x0', 16)
    const minTokens = gate.minTokens || 1

    if (balance >= minTokens) {
      return { granted: true, reason: 'nft_owner', gate }
    }

    return { granted: false, reason: 'nft_not_owned', gate }
  }

  addToAllowlist(gateId: string, walletAddress: string): boolean {
    const row = db
      .select()
      .from(schema.accessGates)
      .where(eq(schema.accessGates.id, gateId))
      .get()

    if (!row || row.type !== 'allowlist') return false

    const allowlist = (row.allowlist as string[]) || []
    const normalized = walletAddress.toLowerCase()

    if (!allowlist.some((a) => a.toLowerCase() === normalized)) {
      allowlist.push(walletAddress)
      db.update(schema.accessGates)
        .set({
          allowlist,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.accessGates.id, gateId))
        .run()
    }

    return true
  }

  removeFromAllowlist(gateId: string, walletAddress: string): boolean {
    const row = db
      .select()
      .from(schema.accessGates)
      .where(eq(schema.accessGates.id, gateId))
      .get()

    if (!row || row.type !== 'allowlist' || !row.allowlist) return false

    const allowlist = row.allowlist as string[]
    const normalized = walletAddress.toLowerCase()
    const filtered = allowlist.filter((a) => a.toLowerCase() !== normalized)

    db.update(schema.accessGates)
      .set({
        allowlist: filtered,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.accessGates.id, gateId))
      .run()

    return true
  }
}

export const accessGateService = new AccessGateService()
