import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearTestDb } from './setup-db-mock.js'

vi.mock('../config/index.js', () => ({
  config: {
    WALRUS_NETWORK: 'testnet',
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 60,
    MAX_CACHE_SIZE: 10,
    WALRUS_EPOCH_DURATION: 300,
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
}))

const mockAxiosPost = vi.fn()
vi.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
}))

import { AccessGateService, RpcError } from '../services/access-gate.js'

describe('AccessGateService', () => {
  let service: AccessGateService

  beforeEach(() => {
    clearTestDb()
    service = new AccessGateService()
    mockAxiosPost.mockReset()
  })

  it('should create a public gate', () => {
    const gate = service.createGate({
      cids: ['cid-1'],
      type: 'public',
      createdBy: 'user-1',
    })

    expect(gate.id).toBeDefined()
    expect(gate.type).toBe('public')
  })

  it('should create an allowlist gate', () => {
    const gate = service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA', '0xBBB'],
      createdBy: 'user-1',
    })

    expect(gate.type).toBe('allowlist')
    expect(gate.allowlist!.length).toBe(2)
  })

  it('should create an NFT gate', () => {
    const gate = service.createGate({
      cids: ['cid-1', 'cid-2'],
      type: 'nft',
      contractAddress: '0xContract',
      chain: 'ethereum',
      minTokens: 1,
      createdBy: 'user-1',
    })

    expect(gate.type).toBe('nft')
    expect(gate.cids.length).toBe(2)
  })

  it('should grant access for public CIDs (no gate)', async () => {
    const result = await service.checkAccess('ungated-cid')
    expect(result.granted).toBe(true)
    expect(result.reason).toBe('public')
  })

  it('should grant access for public gate', async () => {
    service.createGate({
      cids: ['cid-1'],
      type: 'public',
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-1')
    expect(result.granted).toBe(true)
  })

  it('should require wallet for non-public gates', async () => {
    service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-1')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('wallet_required')
  })

  it('should grant allowlist access for listed wallet', async () => {
    service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA', '0xBBB'],
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-1', '0xAAA')
    expect(result.granted).toBe(true)
    expect(result.reason).toBe('allowlist_match')
  })

  it('should deny allowlist access for unlisted wallet', async () => {
    service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-1', '0xCCC')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('not_in_allowlist')
  })

  it('should be case-insensitive for allowlist', async () => {
    service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-1', '0xaaa')
    expect(result.granted).toBe(true)
  })

  it('should add wallet to allowlist', () => {
    const gate = service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    const added = service.addToAllowlist(gate.id, '0xBBB')
    expect(added).toBe(true)

    const updatedGate = service.getGateForCid('cid-1')
    expect(updatedGate!.allowlist!.length).toBe(2)
  })

  it('should remove wallet from allowlist', () => {
    const gate = service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA', '0xBBB'],
      createdBy: 'user-1',
    })

    const removed = service.removeFromAllowlist(gate.id, '0xAAA')
    expect(removed).toBe(true)

    const updatedGate = service.getGateForCid('cid-1')
    expect(updatedGate!.allowlist!.length).toBe(1)
  })

  it('should remove a gate', () => {
    const gate = service.createGate({
      cids: ['cid-1'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    service.removeGate(gate.id)
    expect(service.getGateForCid('cid-1')).toBeNull()
  })

  it('should list all gates', () => {
    service.createGate({ cids: ['cid-1'], type: 'public', createdBy: 'u1' })
    service.createGate({ cids: ['cid-2'], type: 'public', createdBy: 'u2' })

    const gates = service.listGates()
    expect(gates.length).toBe(2)
  })

  // --- New tests: RPC resilience ---

  it('should return service_unavailable on Sui RPC timeout', async () => {
    service.createGate({
      cids: ['cid-nft'],
      type: 'nft',
      contractAddress: '0xPackage',
      chain: 'sui',
      createdBy: 'user-1',
    })

    mockAxiosPost.mockRejectedValue(new Error('timeout of 10000ms exceeded'))

    const result = await service.checkAccess('cid-nft', '0xWallet')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('service_unavailable')
  }, 30_000)

  it('should throw RpcError on Sui JSON-RPC error response', async () => {
    service.createGate({
      cids: ['cid-nft2'],
      type: 'nft',
      contractAddress: '0xPackage',
      chain: 'sui',
      createdBy: 'user-1',
    })

    mockAxiosPost.mockResolvedValue({
      data: { jsonrpc: '2.0', error: { code: -32000, message: 'rate limited' } },
    })

    const result = await service.checkAccess('cid-nft2', '0xWallet')
    expect(result.granted).toBe(false)
    expect(result.reason).toContain('rpc_error')
  }, 30_000)

  it('should handle Ethereum RPC failure gracefully', async () => {
    service.createGate({
      cids: ['cid-eth'],
      type: 'nft',
      contractAddress: '0xContract',
      chain: 'ethereum',
      createdBy: 'user-1',
    })

    mockAxiosPost.mockRejectedValue(new Error('network error'))

    const result = await service.checkAccess('cid-eth', '0xWallet')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('service_unavailable')
  }, 30_000)

  it('should open circuit breaker after consecutive failures', async () => {
    service.createGate({
      cids: ['cid-cb'],
      type: 'nft',
      contractAddress: '0xPkg',
      chain: 'sui',
      createdBy: 'user-1',
    })

    mockAxiosPost.mockRejectedValue(new Error('timeout'))

    // Trigger 3 failures to open the circuit
    await service.checkAccess('cid-cb', '0xW')
    await service.checkAccess('cid-cb', '0xW')
    await service.checkAccess('cid-cb', '0xW')

    // 4th call should not even hit RPC
    mockAxiosPost.mockClear()
    const result = await service.checkAccess('cid-cb', '0xW')
    expect(result.reason).toBe('service_unavailable')
    expect(mockAxiosPost).not.toHaveBeenCalled()
  }, 60_000)

  it('should return gate_misconfigured for NFT gate without contract', async () => {
    service.createGate({
      cids: ['cid-bad'],
      type: 'nft',
      createdBy: 'user-1',
    })

    const result = await service.checkAccess('cid-bad', '0xWallet')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('gate_misconfigured')
  })

  it('should not duplicate wallet in allowlist on repeated add', () => {
    const gate = service.createGate({
      cids: ['cid-dup'],
      type: 'allowlist',
      allowlist: ['0xAAA'],
      createdBy: 'user-1',
    })

    service.addToAllowlist(gate.id, '0xAAA')
    service.addToAllowlist(gate.id, '0xaaa')

    const updated = service.getGateForCid('cid-dup')
    expect(updated!.allowlist!.length).toBe(1)
  })

  it('should generate gate IDs with crypto.randomUUID format', () => {
    const gate = service.createGate({
      cids: ['cid-uuid'],
      type: 'public',
      createdBy: 'user-1',
    })

    expect(gate.id).toMatch(/^gate_[0-9a-f]{8}-[0-9a-f]{4}-/)
  })
})
