import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import path from 'node:path'
import fs from 'node:fs'
import * as schema from './schema.js'

// Database file location (configurable via env)
const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), 'data')
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'walcache.db')

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// Create SQLite connection with WAL mode for better concurrent performance
const sqlite = new Database(DB_PATH)
sqlite.run('PRAGMA journal_mode = WAL')
sqlite.run('PRAGMA foreign_keys = ON')
sqlite.run('PRAGMA busy_timeout = 5000')

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema })

// SQL statements for table creation (static SQL, no user input)
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    subscription_status TEXT NOT NULL DEFAULT 'active',
    subscription_expires TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    last_used TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS token_usage (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    total_requests INTEGER NOT NULL DEFAULT 0,
    monthly_requests INTEGER NOT NULL DEFAULT 0,
    daily_requests INTEGER NOT NULL DEFAULT 0,
    total_bandwidth INTEGER NOT NULL DEFAULT 0,
    monthly_bandwidth INTEGER NOT NULL DEFAULT 0,
    daily_bandwidth INTEGER NOT NULL DEFAULT 0,
    cache_hits INTEGER NOT NULL DEFAULT 0,
    cache_misses INTEGER NOT NULL DEFAULT 0,
    upload_count INTEGER NOT NULL DEFAULT 0,
    storage_used INTEGER NOT NULL DEFAULT 0,
    last_reset_date TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_limits (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    requests_per_minute INTEGER NOT NULL,
    requests_per_day INTEGER NOT NULL,
    requests_per_month INTEGER NOT NULL,
    bandwidth_per_month INTEGER NOT NULL,
    max_storage_size INTEGER NOT NULL,
    max_upload_size INTEGER NOT NULL,
    max_concurrent_connections INTEGER NOT NULL,
    allowed_features TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS access_gates (
    id TEXT PRIMARY KEY,
    cids TEXT NOT NULL,
    type TEXT NOT NULL,
    contract_address TEXT,
    chain TEXT,
    min_tokens INTEGER,
    allowlist TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cid_gate_mapping (
    cid TEXT PRIMARY KEY,
    gate_id TEXT NOT NULL REFERENCES access_gates(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deploy_entries (
    id TEXT PRIMARY KEY,
    site TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest_blob_id TEXT NOT NULL,
    entrypoint TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    deployed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deploy_files (
    id TEXT PRIMARY KEY,
    deploy_id TEXT NOT NULL REFERENCES deploy_entries(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    blob_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    headers TEXT,
    retry_policy TEXT NOT NULL,
    rate_limit TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cid_stats (
    cid TEXT PRIMARY KEY,
    total_requests INTEGER NOT NULL DEFAULT 0,
    cache_hits INTEGER NOT NULL DEFAULT 0,
    cache_misses INTEGER NOT NULL DEFAULT 0,
    hit_rate REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    first_access TEXT,
    last_access TEXT NOT NULL,
    total_bytes_served INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS geo_stats (
    region TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_token_usage_token_id ON token_usage(token_id);
  CREATE INDEX IF NOT EXISTS idx_access_gates_created_by ON access_gates(created_by);
  CREATE INDEX IF NOT EXISTS idx_cid_gate_gate_id ON cid_gate_mapping(gate_id);
  CREATE INDEX IF NOT EXISTS idx_deploy_entries_site ON deploy_entries(site);
  CREATE INDEX IF NOT EXISTS idx_deploy_files_deploy_id ON deploy_files(deploy_id);
  CREATE INDEX IF NOT EXISTS idx_cid_stats_requests ON cid_stats(total_requests);
  CREATE INDEX IF NOT EXISTS idx_cid_stats_last_access ON cid_stats(last_access);
`

// Initialize tables
export function initializeDatabase(): void {
  sqlite.run(CREATE_TABLES_SQL)
  console.log(`Database initialized at ${DB_PATH}`)
}

// Close database on shutdown
export function closeDatabase(): void {
  sqlite.close()
}

// Re-export schema for convenience
export { schema }
