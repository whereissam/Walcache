import crypto from 'crypto'
import bcrypt from 'bcrypt'
import {
  User,
  ApiToken,
  TokenUsage,
  TokenLimits,
  SubscriptionTier,
  SubscriptionStatus,
  ApiPermission,
  UserRegistration,
  LoginCredentials,
  TokenRequest,
  AuthenticatedUser,
  SubscriptionPlan,
} from '../types/user.js'
import { BaseError, ErrorCode } from '../errors/base-error.js'
import { metricsService } from './metrics.js'

export interface IUserService {
  initialize(): Promise<void>
  registerUser(registration: UserRegistration): Promise<User>
  loginUser(credentials: LoginCredentials): Promise<AuthenticatedUser>
  getUserById(id: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  updateUserSubscription(userId: string, tier: SubscriptionTier): Promise<User>
  createApiToken(userId: string, tokenRequest: TokenRequest): Promise<ApiToken>
  validateApiToken(token: string): Promise<AuthenticatedUser | null>
  revokeApiToken(tokenId: string): Promise<void>
  getUserTokens(userId: string): Promise<ApiToken[]>
  updateTokenUsage(tokenId: string, usage: Partial<TokenUsage>): Promise<void>
  getSubscriptionPlans(): SubscriptionPlan[]
  checkUsageLimits(token: ApiToken): Promise<boolean>
}

export class UserService implements IUserService {
  private users = new Map<string, User>()
  private tokens = new Map<string, ApiToken>()
  private tokensByUser = new Map<string, Set<string>>()
  private subscriptionPlans: SubscriptionPlan[] = []

  async initialize(): Promise<void> {
    this.initializeSubscriptionPlans()
    console.log('👤 User service initialized')
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
          bandwidthPerMonth: 1024 * 1024 * 1024, // 1GB
          maxStorageSize: 100 * 1024 * 1024, // 100MB
          maxUploadSize: 10 * 1024 * 1024, // 10MB
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
          bandwidthPerMonth: 10 * 1024 * 1024 * 1024, // 10GB
          maxStorageSize: 1024 * 1024 * 1024, // 1GB
          maxUploadSize: 100 * 1024 * 1024, // 100MB
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
          bandwidthPerMonth: 100 * 1024 * 1024 * 1024, // 100GB
          maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
          maxUploadSize: 1024 * 1024 * 1024, // 1GB
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
          bandwidthPerMonth: 1024 * 1024 * 1024 * 1024, // 1TB
          maxStorageSize: 100 * 1024 * 1024 * 1024, // 100GB
          maxUploadSize: 10 * 1024 * 1024 * 1024, // 10GB
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
    const user: User = {
      id: this.generateId(),
      email: registration.email,
      username: registration.username,
      hashedPassword,
      subscriptionTier: registration.subscriptionTier || SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }

    this.users.set(user.id, user)
    metricsService.counter('users.registered', 1, {
      tier: user.subscriptionTier,
    })

    return user
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
    user.lastLogin = new Date()
    this.users.set(user.id, user)

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
    return this.users.get(id) || null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async updateUserSubscription(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<User> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new BaseError('User not found', ErrorCode.VALIDATION_FAILED, 404)
    }

    user.subscriptionTier = tier
    user.subscriptionStatus = SubscriptionStatus.ACTIVE
    user.subscriptionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    user.updatedAt = new Date()

    this.users.set(userId, user)
    metricsService.counter('users.subscription_updated', 1, { tier })

    return user
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

    // Generate secure token
    const tokenString = this.generateToken()
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenString)
      .digest('hex')

    const token: ApiToken = {
      id: this.generateId(),
      userId,
      token: tokenString,
      tokenHash,
      name: tokenRequest.name,
      permissions: tokenRequest.permissions.filter((p) =>
        plan.limits.allowedFeatures.includes(p),
      ),
      usage: {
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
      },
      limits: plan.limits,
      createdAt: new Date(),
      expiresAt: tokenRequest.expiresAt,
      isActive: true,
    }

    this.tokens.set(token.id, token)

    // Track tokens by user
    if (!this.tokensByUser.has(userId)) {
      this.tokensByUser.set(userId, new Set())
    }
    this.tokensByUser.get(userId)!.add(token.id)

    metricsService.counter('api_tokens.created', 1, {
      tier: user.subscriptionTier,
    })

    return token
  }

  async validateApiToken(
    tokenString: string,
  ): Promise<AuthenticatedUser | null> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenString)
      .digest('hex')

    for (const token of this.tokens.values()) {
      if (token.tokenHash === tokenHash && token.isActive) {
        // Check if token is expired
        if (token.expiresAt && token.expiresAt < new Date()) {
          token.isActive = false
          this.tokens.set(token.id, token)
          continue
        }

        const user = await this.getUserById(token.userId)
        if (!user || !user.isActive) {
          continue
        }

        // Update last used
        token.lastUsed = new Date()
        this.tokens.set(token.id, token)

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          token,
          permissions: token.permissions,
        }
      }
    }

    return null
  }

  async revokeApiToken(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId)
    if (token) {
      token.isActive = false
      this.tokens.set(tokenId, token)
      metricsService.counter('api_tokens.revoked', 1)
    }
  }

  async getUserTokens(userId: string): Promise<ApiToken[]> {
    const tokenIds = this.tokensByUser.get(userId) || new Set()
    const tokens: ApiToken[] = []

    for (const tokenId of tokenIds) {
      const token = this.tokens.get(tokenId)
      if (token && token.isActive) {
        // Don't return the actual token string for security
        tokens.push({
          ...token,
          token: `${token.token.slice(0, 8)}...`,
        })
      }
    }

    return tokens
  }

  async updateTokenUsage(
    tokenId: string,
    usage: Partial<TokenUsage>,
  ): Promise<void> {
    const token = this.tokens.get(tokenId)
    if (token) {
      token.usage = { ...token.usage, ...usage }
      this.tokens.set(tokenId, token)
    }
  }

  getSubscriptionPlans(): SubscriptionPlan[] {
    return this.subscriptionPlans.filter((plan) => plan.isActive)
  }

  async checkUsageLimits(token: ApiToken): Promise<boolean> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Reset daily usage if needed
    if (token.usage.lastResetDate < today) {
      token.usage.dailyRequests = 0
      token.usage.dailyBandwidth = 0
      token.usage.lastResetDate = today
    }

    // Reset monthly usage if needed
    if (token.usage.lastResetDate < thisMonth) {
      token.usage.monthlyRequests = 0
      token.usage.monthlyBandwidth = 0
    }

    // Check limits
    const limits = token.limits
    if (token.usage.dailyRequests >= limits.requestsPerDay) return false
    if (token.usage.monthlyRequests >= limits.requestsPerMonth) return false
    if (token.usage.monthlyBandwidth >= limits.bandwidthPerMonth) return false

    return true
  }

  private generateId(): string {
    return crypto.randomUUID()
  }

  private generateToken(): string {
    return `wcdn_${crypto.randomBytes(32).toString('hex')}`
  }

  async destroy(): Promise<void> {
    this.users.clear()
    this.tokens.clear()
    this.tokensByUser.clear()
  }
}

export const userService = new UserService()
