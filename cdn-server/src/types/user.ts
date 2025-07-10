export interface User {
  id: string
  email: string
  username: string
  hashedPassword: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionExpires: Date
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  lastLogin?: Date
  metadata?: Record<string, any>
}

export interface ApiToken {
  id: string
  userId: string
  token: string
  tokenHash: string
  name: string
  permissions: ApiPermission[]
  usage: TokenUsage
  limits: TokenLimits
  createdAt: Date
  expiresAt?: Date
  lastUsed?: Date
  isActive: boolean
  metadata?: Record<string, any>
}

export interface TokenUsage {
  totalRequests: number
  monthlyRequests: number
  dailyRequests: number
  totalBandwidth: number
  monthlyBandwidth: number
  dailyBandwidth: number
  cacheHits: number
  cacheMisses: number
  uploadCount: number
  storageUsed: number
  lastResetDate: Date
}

export interface TokenLimits {
  requestsPerMinute: number
  requestsPerDay: number
  requestsPerMonth: number
  bandwidthPerMonth: number // in bytes
  maxStorageSize: number // in bytes
  maxUploadSize: number // in bytes
  maxConcurrentConnections: number
  allowedFeatures: string[]
}

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum ApiPermission {
  READ_CDN = 'read_cdn',
  WRITE_CDN = 'write_cdn',
  UPLOAD_FILES = 'upload_files',
  MANAGE_CACHE = 'manage_cache',
  VIEW_ANALYTICS = 'view_analytics',
  ADMIN = 'admin',
}

export interface SubscriptionPlan {
  tier: SubscriptionTier
  name: string
  price: number
  currency: string
  billingPeriod: 'monthly' | 'yearly'
  limits: TokenLimits
  features: string[]
  isActive: boolean
}

export interface UsageBilling {
  userId: string
  tokenId: string
  billingPeriod: string // YYYY-MM format
  usage: TokenUsage
  cost: number
  currency: string
  createdAt: Date
  isPaid: boolean
  paymentId?: string
}

export interface TokenRequest {
  name: string
  permissions: ApiPermission[]
  expiresAt?: Date
  description?: string
}

export interface UserRegistration {
  email: string
  username: string
  password: string
  subscriptionTier?: SubscriptionTier
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  username: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  token?: ApiToken
  permissions: ApiPermission[]
}
