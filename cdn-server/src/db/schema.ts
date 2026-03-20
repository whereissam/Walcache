import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ============================================================================
// USERS
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  subscriptionStatus: text('subscription_status').notNull().default('active'),
  subscriptionExpires: text('subscription_expires').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastLogin: text('last_login'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata', { mode: 'json' }),
})

// ============================================================================
// API TOKENS
// ============================================================================

export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  name: text('name').notNull(),
  permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at'),
  lastUsed: text('last_used'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata', { mode: 'json' }),
})

// ============================================================================
// TOKEN USAGE
// ============================================================================

export const tokenUsage = sqliteTable('token_usage', {
  id: text('id').primaryKey(),
  tokenId: text('token_id')
    .notNull()
    .references(() => apiTokens.id, { onDelete: 'cascade' }),
  totalRequests: integer('total_requests').notNull().default(0),
  monthlyRequests: integer('monthly_requests').notNull().default(0),
  dailyRequests: integer('daily_requests').notNull().default(0),
  totalBandwidth: integer('total_bandwidth').notNull().default(0),
  monthlyBandwidth: integer('monthly_bandwidth').notNull().default(0),
  dailyBandwidth: integer('daily_bandwidth').notNull().default(0),
  cacheHits: integer('cache_hits').notNull().default(0),
  cacheMisses: integer('cache_misses').notNull().default(0),
  uploadCount: integer('upload_count').notNull().default(0),
  storageUsed: integer('storage_used').notNull().default(0),
  lastResetDate: text('last_reset_date').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============================================================================
// TOKEN LIMITS
// ============================================================================

export const tokenLimits = sqliteTable('token_limits', {
  id: text('id').primaryKey(),
  tokenId: text('token_id')
    .notNull()
    .references(() => apiTokens.id, { onDelete: 'cascade' }),
  requestsPerMinute: integer('requests_per_minute').notNull(),
  requestsPerDay: integer('requests_per_day').notNull(),
  requestsPerMonth: integer('requests_per_month').notNull(),
  bandwidthPerMonth: integer('bandwidth_per_month').notNull(),
  maxStorageSize: integer('max_storage_size').notNull(),
  maxUploadSize: integer('max_upload_size').notNull(),
  maxConcurrentConnections: integer('max_concurrent_connections').notNull(),
  allowedFeatures: text('allowed_features', { mode: 'json' }).notNull().$type<string[]>(),
})

// ============================================================================
// ACCESS GATES
// ============================================================================

export const accessGates = sqliteTable('access_gates', {
  id: text('id').primaryKey(),
  cids: text('cids', { mode: 'json' }).notNull().$type<string[]>(),
  type: text('type').notNull(), // 'nft', 'allowlist', 'public'
  contractAddress: text('contract_address'),
  chain: text('chain'), // 'sui' or 'ethereum'
  minTokens: integer('min_tokens'),
  allowlist: text('allowlist', { mode: 'json' }).$type<string[]>(),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// CID → Gate lookup (denormalized for fast reads)
export const cidGateMapping = sqliteTable('cid_gate_mapping', {
  cid: text('cid').primaryKey(),
  gateId: text('gate_id')
    .notNull()
    .references(() => accessGates.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})

// ============================================================================
// DEPLOY LOGS
// ============================================================================

export const deployEntries = sqliteTable('deploy_entries', {
  id: text('id').primaryKey(),
  site: text('site').notNull(),
  version: text('version').notNull(),
  manifestBlobId: text('manifest_blob_id').notNull(),
  entrypoint: text('entrypoint'),
  status: text('status').notNull().default('active'), // 'active', 'rolled_back', 'superseded'
  deployedAt: text('deployed_at').notNull(),
  createdAt: text('created_at').notNull(),
})

export const deployFiles = sqliteTable('deploy_files', {
  id: text('id').primaryKey(),
  deployId: text('deploy_id')
    .notNull()
    .references(() => deployEntries.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  blobId: text('blob_id').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
})

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

export const webhookEndpoints = sqliteTable('webhook_endpoints', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events', { mode: 'json' }).notNull().$type<string[]>(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  headers: text('headers', { mode: 'json' }),
  retryPolicy: text('retry_policy', { mode: 'json' }).notNull(),
  rateLimit: text('rate_limit', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============================================================================
// ANALYTICS (aggregated stats, not raw events)
// ============================================================================

export const cidStats = sqliteTable('cid_stats', {
  cid: text('cid').primaryKey(),
  totalRequests: integer('total_requests').notNull().default(0),
  cacheHits: integer('cache_hits').notNull().default(0),
  cacheMisses: integer('cache_misses').notNull().default(0),
  hitRate: real('hit_rate').default(0),
  avgLatency: real('avg_latency').default(0),
  firstAccess: text('first_access'),
  lastAccess: text('last_access').notNull(),
  totalBytesServed: integer('total_bytes_served').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const geoStats = sqliteTable('geo_stats', {
  region: text('region').primaryKey(),
  requestCount: integer('request_count').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
})
