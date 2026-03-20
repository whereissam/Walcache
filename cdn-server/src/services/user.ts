import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { SubscriptionStatus, SubscriptionTier } from '../types/user.js'
import { BaseError, ErrorCode } from '../errors/base-error.js'
import { metricsService } from './metrics.js'
import type {
  ApiPermission,
  ApiToken,
  AuthenticatedUser,
  LoginCredentials,
  SubscriptionPlan,
  TokenLimits,
  TokenRequest,
  TokenUsage,
  User,
  UserRegistration,
} from '../types/user.js'

export interface IUserService {
  initialize: () => Promise<void>
  registerUser: (registration: UserRegistration) => Promise<User>
  loginUser: (credentials: LoginCredentials) => Promise<AuthenticatedUser>
  getUserById: (id: string) => Promise<User | null>
  getUserByEmail: (email: string) => Promise<User | null>
  updateUserSubscription: (
    userId: string,
    tier: SubscriptionTier,
  ) => Promise<User>
  createApiToken: (
    userId: string,
    tokenRequest: TokenRequest,
  ) => Promise<ApiToken>
  validateApiToken: (token: string) => Promise<AuthenticatedUser | null>
  revokeApiToken: (tokenId: string) => Promise<void>
  getUserTokens: (userId: string) => Promise<Array<ApiToken>>
  updateTokenUsage: (
    tokenId: string,
    usage: Partial<TokenUsage>,
  ) => Promise<void>
  getSubscriptionPlans: () => Array<SubscriptionPlan>
  checkUsageLimits: (token: ApiToken) => Promise<boolean>
}

// Helper to convert DB row → User domain object
function rowToUser(row: typeof schema.users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    hashedPassword: row.hashedPassword,
    subscriptionTier: row.subscriptionTier as SubscriptionTier,
    subscriptionStatus: row.subscriptionStatus as SubscriptionStatus,
    subscriptionExpires: new Date(row.subscriptionExpires),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastLogin: row.lastLogin ? new Date(row.lastLogin) : undefined,
    isActive: row.isActive,
  }
}

export class UserService implements IUserService {
  private subscriptionPlans: Array<SubscriptionPlan> = []

  async initialize(): Promise<void> {
    this.initializeSubscriptionPlans()
    console.log('User service initialized (SQLite)')
  }

  private initializeSubscriptionPlans(): void {
    this.subscriptionPlans = [
      {
        tier: SubscriptionTier.FREE,
        name: 'Free',
        price: 0,
        currency: 'USD',
        billingPeriod: 'monthly',
        limits: {
          requestsPerMinute: 10,
          requestsPerDay: 1000,
          requestsPerMonth: 10000,
          bandwidthPerMonth: 1024 * 1024 * 1024,
          maxStorageSize: 100 * 1024 * 1024,
          maxUploadSize: 10 * 1024 * 1024,
          maxConcurrentConnections: 5,
          allowedFeatures: ['read_cdn', 'upload_files'],
        },
        features: ['Basic CDN access', 'File uploads', 'Basic analytics'],
        isActive: true,
      },
      {
        tier: SubscriptionTier.STARTER,
        name: 'Starter',
        price: 29,
        currency: 'USD',
        billingPeriod: 'monthly',
        limits: {
          requestsPerMinute: 100,
          requestsPerDay: 50000,
          requestsPerMonth: 1000000,
          bandwidthPerMonth: 10 * 1024 * 1024 * 1024,
          maxStorageSize: 1024 * 1024 * 1024,
          maxUploadSize: 100 * 1024 * 1024,
          maxConcurrentConnections: 20,
          allowedFeatures: [
            'read_cdn',
            'write_cdn',
            'upload_files',
            'view_analytics',
          ],
        },
        features: [
          'Enhanced CDN access',
          'Cache management',
          'Advanced analytics',
          'Priority support',
        ],
        isActive: true,
      },
      {
        tier: SubscriptionTier.PROFESSIONAL,
        name: 'Professional',
        price: 99,
        currency: 'USD',
        billingPeriod: 'monthly',
        limits: {
          requestsPerMinute: 1000,
          requestsPerDay: 1000000,
          requestsPerMonth: 10000000,
          bandwidthPerMonth: 100 * 1024 * 1024 * 1024,
          maxStorageSize: 10 * 1024 * 1024 * 1024,
          maxUploadSize: 1024 * 1024 * 1024,
          maxConcurrentConnections: 100,
          allowedFeatures: [
            'read_cdn',
            'write_cdn',
            'upload_files',
            'manage_cache',
            'view_analytics',
          ],
        },
        features: [
          'Full CDN access',
          'Advanced cache management',
          'Real-time analytics',
          'API webhooks',
        ],
        isActive: true,
      },
      {
        tier: SubscriptionTier.ENTERPRISE,
        name: 'Enterprise',
        price: 299,
        currency: 'USD',
        billingPeriod: 'monthly',
        limits: {
          requestsPerMinute: 10000,
          requestsPerDay: 10000000,
          requestsPerMonth: 100000000,
          bandwidthPerMonth: 1024 * 1024 * 1024 * 1024,
          maxStorageSize: 100 * 1024 * 1024 * 1024,
          maxUploadSize: 10 * 1024 * 1024 * 1024,
          maxConcurrentConnections: 500,
          allowedFeatures: [
            'read_cdn',
            'write_cdn',
            'upload_files',
            'manage_cache',
            'view_analytics',
            'admin',
          ],
        },
        features: [
          'Unlimited CDN access',
          'Enterprise cache management',
          'Custom analytics',
          'Dedicated support',
        ],
        isActive: true,
      },
    ]
  }

  async registerUser(registration: UserRegistration): Promise<User> {
    const existingUser = await this.getUserByEmail(registration.email)
    if (existingUser) {
      throw new BaseError(
        'User with this email already exists',
        ErrorCode.VALIDATION_FAILED,
        400,
      )
    }

    const hashedPassword = await bcrypt.hash(registration.password, 12)
    const now = new Date().toISOString()
    const id = this.generateId()
    const tier =
      registration.subscriptionTier || SubscriptionTier.FREE
    const expires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString()

    db.insert(schema.users)
      .values({
        id,
        email: registration.email,
        username: registration.username,
        hashedPassword,
        subscriptionTier: tier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionExpires: expires,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      })
      .run()

    metricsService.counter('users.registered', 1, { tier })

    const user = await this.getUserById(id)
    return user!
  }

  async loginUser(credentials: LoginCredentials): Promise<AuthenticatedUser> {
    const user = await this.getUserByEmail(credentials.email)
    if (!user) {
      throw new BaseError(
        'Invalid credentials',
        ErrorCode.AUTH_INVALID_API_KEY,
        401,
      )
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.hashedPassword,
    )
    if (!isPasswordValid) {
      throw new BaseError(
        'Invalid credentials',
        ErrorCode.AUTH_INVALID_API_KEY,
        401,
      )
    }

    if (!user.isActive) {
      throw new BaseError(
        'Account is deactivated',
        ErrorCode.AUTH_INVALID_API_KEY,
        403,
      )
    }

    // Update last login
    const now = new Date().toISOString()
    db.update(schema.users)
      .set({ lastLogin: now, updatedAt: now })
      .where(eq(schema.users.id, user.id))
      .run()

    const plan = this.getSubscriptionPlans().find(
      (p) => p.tier === user.subscriptionTier,
    )
    const permissions =
      plan?.limits.allowedFeatures.map((f) => f as ApiPermission) || []

    metricsService.counter('users.login', 1, { tier: user.subscriptionTier })

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      permissions,
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const row = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get()
    return row ? rowToUser(row) : null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get()
    return row ? rowToUser(row) : null
  }

  async updateUserSubscription(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<User> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new BaseError('User not found', ErrorCode.VALIDATION_FAILED, 404)
    }

    const now = new Date().toISOString()
    const expires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString()

    db.update(schema.users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionExpires: expires,
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId))
      .run()

    metricsService.counter('users.subscription_updated', 1, { tier })

    return (await this.getUserById(userId))!
  }

  async createApiToken(
    userId: string,
    tokenRequest: TokenRequest,
  ): Promise<ApiToken> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new BaseError('User not found', ErrorCode.VALIDATION_FAILED, 404)
    }

    const plan = this.getSubscriptionPlans().find(
      (p) => p.tier === user.subscriptionTier,
    )
    if (!plan) {
      throw new BaseError(
        'Invalid subscription plan',
        ErrorCode.VALIDATION_FAILED,
        400,
      )
    }

    const tokenString = this.generateToken()
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenString)
      .digest('hex')

    const tokenId = this.generateId()
    const usageId = this.generateId()
    const limitsId = this.generateId()
    const now = new Date().toISOString()
    const permissions = tokenRequest.permissions.filter((p) =>
      plan.limits.allowedFeatures.includes(p),
    )

    // Insert token
    db.insert(schema.apiTokens)
      .values({
        id: tokenId,
        userId,
        tokenHash,
        name: tokenRequest.name,
        permissions,
        createdAt: now,
        expiresAt: tokenRequest.expiresAt?.toISOString(),
        isActive: true,
      })
      .run()

    // Insert usage tracker
    db.insert(schema.tokenUsage)
      .values({
        id: usageId,
        tokenId,
        lastResetDate: now,
        updatedAt: now,
      })
      .run()

    // Insert limits
    db.insert(schema.tokenLimits)
      .values({
        id: limitsId,
        tokenId,
        requestsPerMinute: plan.limits.requestsPerMinute,
        requestsPerDay: plan.limits.requestsPerDay,
        requestsPerMonth: plan.limits.requestsPerMonth,
        bandwidthPerMonth: plan.limits.bandwidthPerMonth,
        maxStorageSize: plan.limits.maxStorageSize,
        maxUploadSize: plan.limits.maxUploadSize,
        maxConcurrentConnections: plan.limits.maxConcurrentConnections,
        allowedFeatures: plan.limits.allowedFeatures,
      })
      .run()

    metricsService.counter('api_tokens.created', 1, {
      tier: user.subscriptionTier,
    })

    // Return full token object (just inserted, guaranteed to exist)
    const result = await this.buildApiToken(tokenId, tokenString)
    return result!
  }

  async validateApiToken(
    tokenString: string,
  ): Promise<AuthenticatedUser | null> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenString)
      .digest('hex')

    const tokenRow = db
      .select()
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.tokenHash, tokenHash))
      .get()

    if (!tokenRow || !tokenRow.isActive) {
      return null
    }

    // Check expiry
    if (tokenRow.expiresAt && new Date(tokenRow.expiresAt) < new Date()) {
      db.update(schema.apiTokens)
        .set({ isActive: false })
        .where(eq(schema.apiTokens.id, tokenRow.id))
        .run()
      return null
    }

    const user = await this.getUserById(tokenRow.userId)
    if (!user || !user.isActive) {
      return null
    }

    // Update last used
    db.update(schema.apiTokens)
      .set({ lastUsed: new Date().toISOString() })
      .where(eq(schema.apiTokens.id, tokenRow.id))
      .run()

    const token = await this.buildApiToken(tokenRow.id, tokenString)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      token: token || undefined,
      permissions: tokenRow.permissions as ApiPermission[],
    }
  }

  async revokeApiToken(tokenId: string): Promise<void> {
    db.update(schema.apiTokens)
      .set({ isActive: false })
      .where(eq(schema.apiTokens.id, tokenId))
      .run()
    metricsService.counter('api_tokens.revoked', 1)
  }

  async getUserTokens(userId: string): Promise<Array<ApiToken>> {
    const rows = db
      .select()
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.userId, userId))
      .all()

    const tokens: Array<ApiToken> = []
    for (const row of rows) {
      if (!row.isActive) continue
      const token = await this.buildApiToken(row.id)
      if (token) {
        // Mask the token string for security
        token.token = `${token.token.slice(0, 8)}...`
        tokens.push(token)
      }
    }

    return tokens
  }

  async updateTokenUsage(
    tokenId: string,
    usage: Partial<TokenUsage>,
  ): Promise<void> {
    const existing = db
      .select()
      .from(schema.tokenUsage)
      .where(eq(schema.tokenUsage.tokenId, tokenId))
      .get()

    if (!existing) return

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (usage.totalRequests !== undefined)
      updates.totalRequests = usage.totalRequests
    if (usage.monthlyRequests !== undefined)
      updates.monthlyRequests = usage.monthlyRequests
    if (usage.dailyRequests !== undefined)
      updates.dailyRequests = usage.dailyRequests
    if (usage.totalBandwidth !== undefined)
      updates.totalBandwidth = usage.totalBandwidth
    if (usage.monthlyBandwidth !== undefined)
      updates.monthlyBandwidth = usage.monthlyBandwidth
    if (usage.dailyBandwidth !== undefined)
      updates.dailyBandwidth = usage.dailyBandwidth
    if (usage.cacheHits !== undefined) updates.cacheHits = usage.cacheHits
    if (usage.cacheMisses !== undefined) updates.cacheMisses = usage.cacheMisses
    if (usage.uploadCount !== undefined) updates.uploadCount = usage.uploadCount
    if (usage.storageUsed !== undefined) updates.storageUsed = usage.storageUsed

    db.update(schema.tokenUsage)
      .set(updates)
      .where(eq(schema.tokenUsage.tokenId, tokenId))
      .run()
  }

  getSubscriptionPlans(): Array<SubscriptionPlan> {
    return this.subscriptionPlans.filter((plan) => plan.isActive)
  }

  async checkUsageLimits(token: ApiToken): Promise<boolean> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Reset daily/monthly usage if needed
    if (token.usage.lastResetDate < today) {
      token.usage.dailyRequests = 0
      token.usage.dailyBandwidth = 0
      token.usage.lastResetDate = today
    }
    if (token.usage.lastResetDate < thisMonth) {
      token.usage.monthlyRequests = 0
      token.usage.monthlyBandwidth = 0
    }

    const limits = token.limits
    if (token.usage.dailyRequests >= limits.requestsPerDay) return false
    if (token.usage.monthlyRequests >= limits.requestsPerMonth) return false
    if (token.usage.monthlyBandwidth >= limits.bandwidthPerMonth) return false

    return true
  }

  // Build a full ApiToken domain object from DB rows
  private async buildApiToken(
    tokenId: string,
    rawToken?: string,
  ): Promise<ApiToken | null> {
    const tokenRow = db
      .select()
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.id, tokenId))
      .get()

    if (!tokenRow) return null

    const usageRow = db
      .select()
      .from(schema.tokenUsage)
      .where(eq(schema.tokenUsage.tokenId, tokenId))
      .get()

    const limitsRow = db
      .select()
      .from(schema.tokenLimits)
      .where(eq(schema.tokenLimits.tokenId, tokenId))
      .get()

    const usage: TokenUsage = usageRow
      ? {
          totalRequests: usageRow.totalRequests,
          monthlyRequests: usageRow.monthlyRequests,
          dailyRequests: usageRow.dailyRequests,
          totalBandwidth: usageRow.totalBandwidth,
          monthlyBandwidth: usageRow.monthlyBandwidth,
          dailyBandwidth: usageRow.dailyBandwidth,
          cacheHits: usageRow.cacheHits,
          cacheMisses: usageRow.cacheMisses,
          uploadCount: usageRow.uploadCount,
          storageUsed: usageRow.storageUsed,
          lastResetDate: new Date(usageRow.lastResetDate),
        }
      : {
          totalRequests: 0,
          monthlyRequests: 0,
          dailyRequests: 0,
          totalBandwidth: 0,
          monthlyBandwidth: 0,
          dailyBandwidth: 0,
          cacheHits: 0,
          cacheMisses: 0,
          uploadCount: 0,
          storageUsed: 0,
          lastResetDate: new Date(),
        }

    const limits: TokenLimits = limitsRow
      ? {
          requestsPerMinute: limitsRow.requestsPerMinute,
          requestsPerDay: limitsRow.requestsPerDay,
          requestsPerMonth: limitsRow.requestsPerMonth,
          bandwidthPerMonth: limitsRow.bandwidthPerMonth,
          maxStorageSize: limitsRow.maxStorageSize,
          maxUploadSize: limitsRow.maxUploadSize,
          maxConcurrentConnections: limitsRow.maxConcurrentConnections,
          allowedFeatures: limitsRow.allowedFeatures as string[],
        }
      : this.subscriptionPlans[0].limits

    return {
      id: tokenRow.id,
      userId: tokenRow.userId,
      token: rawToken || '(redacted)',
      tokenHash: tokenRow.tokenHash,
      name: tokenRow.name,
      permissions: tokenRow.permissions as ApiPermission[],
      usage,
      limits,
      createdAt: new Date(tokenRow.createdAt),
      expiresAt: tokenRow.expiresAt ? new Date(tokenRow.expiresAt) : undefined,
      lastUsed: tokenRow.lastUsed ? new Date(tokenRow.lastUsed) : undefined,
      isActive: tokenRow.isActive,
    }
  }

  private generateId(): string {
    return crypto.randomUUID()
  }

  private generateToken(): string {
    return `wcdn_${crypto.randomBytes(32).toString('hex')}`
  }

  async destroy(): Promise<void> {
    // No-op — database handles persistence
  }
}

export const userService = new UserService()
