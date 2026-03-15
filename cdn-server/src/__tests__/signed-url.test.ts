import { describe, it, expect, vi } from 'vitest'

vi.mock('../config/index.js', () => ({
  config: {
    API_KEY_SECRET: 'test-secret-minimum-32-characters-long-here',
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 60,
    MAX_CACHE_SIZE: 10,
    WALRUS_EPOCH_DURATION: 300,
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
  appConfig: {
    secrets: {
      apiKeySecret: 'test-secret-minimum-32-characters-long-here',
    },
  },
}))

import { SignedUrlService } from '../services/signed-url.js'

describe('SignedUrlService', () => {
  const service = new SignedUrlService()

  it('should generate a token', () => {
    const token = service.generateToken({ cid: 'test-cid-123' })
    expect(token).toBeDefined()
    expect(token.split('.').length).toBe(2)
  })

  it('should verify a valid token', () => {
    const token = service.generateToken({ cid: 'test-cid-123' })
    const payload = service.verifyToken(token)

    expect(payload).not.toBeNull()
    expect(payload!.cid).toBe('test-cid-123')
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('should reject an expired token', () => {
    const token = service.generateToken({
      cid: 'test-cid-123',
      expiresIn: -1,
    })
    const payload = service.verifyToken(token)
    expect(payload).toBeNull()
  })

  it('should reject a tampered token', () => {
    const token = service.generateToken({ cid: 'test-cid-123' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    const payload = service.verifyToken(tampered)
    expect(payload).toBeNull()
  })

  it('should reject token with wrong format', () => {
    expect(service.verifyToken('invalid')).toBeNull()
    expect(service.verifyToken('')).toBeNull()
    expect(service.verifyToken('a.b.c')).toBeNull()
  })

  it('should enforce IP restriction', () => {
    const token = service.generateToken({
      cid: 'test-cid-123',
      ip: '1.2.3.4',
    })

    // Correct IP
    const valid = service.verifyToken(token, '1.2.3.4')
    expect(valid).not.toBeNull()

    // Wrong IP
    const invalid = service.verifyToken(token, '5.6.7.8')
    expect(invalid).toBeNull()
  })

  it('should allow access when no IP restriction set', () => {
    const token = service.generateToken({ cid: 'test-cid-123' })
    const payload = service.verifyToken(token, '1.2.3.4')
    expect(payload).not.toBeNull()
  })

  it('should generate a full signed URL', () => {
    const url = service.generateSignedUrl('https://cdn.example.com', {
      cid: 'test-cid-123',
    })

    expect(url).toContain('https://cdn.example.com/cdn/test-cid-123?token=')
  })

  it('should validate request correctly', () => {
    const token = service.generateToken({ cid: 'test-cid-123' })

    const valid = service.validateRequest('test-cid-123', token)
    expect(valid.valid).toBe(true)

    const wrongCid = service.validateRequest('wrong-cid', token)
    expect(wrongCid.valid).toBe(false)
    expect(wrongCid.reason).toBe('cid_mismatch')

    const noToken = service.validateRequest('test-cid-123', undefined)
    expect(noToken.valid).toBe(false)
    expect(noToken.reason).toBe('missing_token')
  })

  it('should include custom metadata', () => {
    const token = service.generateToken({
      cid: 'test-cid-123',
      metadata: { userId: 'user-1', plan: 'pro' },
    })

    const payload = service.verifyToken(token)
    expect(payload!.metadata).toEqual({ userId: 'user-1', plan: 'pro' })
  })

  it('should respect custom expiration', () => {
    const token = service.generateToken({
      cid: 'test-cid-123',
      expiresIn: 60,
    })

    const payload = service.verifyToken(token)
    const now = Math.floor(Date.now() / 1000)
    expect(payload!.exp - now).toBeLessThanOrEqual(60)
    expect(payload!.exp - now).toBeGreaterThan(55)
  })
})
