import crypto from 'node:crypto'
import { config } from '../config/index.js'

export interface SignedUrlOptions {
  /** Blob CID to grant access to */
  cid: string
  /** Expiration time in seconds from now (default: 3600 = 1 hour) */
  expiresIn?: number
  /** Restrict to specific IP address */
  ip?: string
  /** Custom metadata to include in the token */
  metadata?: Record<string, string>
}

export interface SignedUrlPayload {
  cid: string
  exp: number
  iat: number
  ip?: string
  metadata?: Record<string, string>
}

export class SignedUrlService {
  private secret: string

  constructor() {
    this.secret = config.API_KEY_SECRET
  }

  /**
   * Generate a signed URL token for time-limited access to a blob.
   */
  generateToken(options: SignedUrlOptions): string {
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = options.expiresIn || 3600

    const payload: SignedUrlPayload = {
      cid: options.cid,
      iat: now,
      exp: now + expiresIn,
      ip: options.ip,
      metadata: options.metadata,
    }

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    )
    const signature = this.sign(payloadBase64)

    return `${payloadBase64}.${signature}`
  }

  /**
   * Generate a full signed URL for a blob.
   */
  generateSignedUrl(
    baseUrl: string,
    options: SignedUrlOptions,
  ): string {
    const token = this.generateToken(options)
    return `${baseUrl}/cdn/${options.cid}?token=${token}`
  }

  /**
   * Verify a signed URL token. Returns the payload if valid, null if invalid.
   */
  verifyToken(
    token: string,
    clientIp?: string,
  ): SignedUrlPayload | null {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [payloadBase64, signature] = parts

    // Verify signature (length check first to avoid timingSafeEqual RangeError)
    const expectedSignature = this.sign(payloadBase64)
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }

    // Decode payload
    let payload: SignedUrlPayload
    try {
      payload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString(),
      )
    } catch {
      return null
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return null
    }

    // Check IP restriction: if token has IP restriction, deny when IP doesn't match
    // (including when client IP is unknown — fail-closed)
    if (payload.ip && payload.ip !== clientIp) {
      return null
    }

    return payload
  }

  /**
   * Check if a request has a valid signed URL token for the given CID.
   */
  validateRequest(
    cid: string,
    token: string | undefined,
    clientIp?: string,
  ): { valid: boolean; reason?: string } {
    if (!token) {
      return { valid: false, reason: 'missing_token' }
    }

    const payload = this.verifyToken(token, clientIp)
    if (!payload) {
      return { valid: false, reason: 'invalid_or_expired' }
    }

    if (payload.cid !== cid) {
      return { valid: false, reason: 'cid_mismatch' }
    }

    return { valid: true }
  }

  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url')
  }
}

export const signedUrlService = new SignedUrlService()
