import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { AccessGateService } from '../services/access-gate.js'

describe('AccessGateService', () => {
  let service: AccessGateService

  beforeEach(() => {
    service = new AccessGateService()
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
})
