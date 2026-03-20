/**
 * Mock for the db module when running tests under Vitest (Node.js).
 * Uses better-sqlite3 in-memory database so drizzle operations work correctly.
 *
 * Note: sqlite.exec() below uses only static DDL SQL strings (no user input),
 * so there is no command injection risk.
 */
import { vi } from 'vitest'
import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

// Static DDL for test database setup — no user input involved
const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, username TEXT NOT NULL,
    hashed_password TEXT NOT NULL, subscription_tier TEXT NOT NULL DEFAULT 'free',
    subscription_status TEXT NOT NULL DEFAULT 'active', subscription_expires TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, permissions TEXT NOT NULL, created_at TEXT NOT NULL,
    expires_at TEXT, last_used TEXT, is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS token_usage (
    id TEXT PRIMARY KEY, token_id TEXT NOT NULL, total_requests INTEGER DEFAULT 0,
    monthly_requests INTEGER DEFAULT 0, daily_requests INTEGER DEFAULT 0,
    total_bandwidth INTEGER DEFAULT 0, monthly_bandwidth INTEGER DEFAULT 0,
    daily_bandwidth INTEGER DEFAULT 0, cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0, upload_count INTEGER DEFAULT 0,
    storage_used INTEGER DEFAULT 0, last_reset_date TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS token_limits (
    id TEXT PRIMARY KEY, token_id TEXT NOT NULL,
    requests_per_minute INTEGER NOT NULL, requests_per_day INTEGER NOT NULL,
    requests_per_month INTEGER NOT NULL, bandwidth_per_month INTEGER NOT NULL,
    max_storage_size INTEGER NOT NULL, max_upload_size INTEGER NOT NULL,
    max_concurrent_connections INTEGER NOT NULL, allowed_features TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS access_gates (
    id TEXT PRIMARY KEY, cids TEXT NOT NULL, type TEXT NOT NULL,
    contract_address TEXT, chain TEXT, min_tokens INTEGER, allowlist TEXT,
    created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cid_gate_mapping (
    cid TEXT PRIMARY KEY, gate_id TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS deploy_entries (
    id TEXT PRIMARY KEY, site TEXT NOT NULL, version TEXT NOT NULL,
    manifest_blob_id TEXT NOT NULL, entrypoint TEXT,
    status TEXT NOT NULL DEFAULT 'active', deployed_at TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS deploy_files (
    id TEXT PRIMARY KEY, deploy_id TEXT NOT NULL, path TEXT NOT NULL,
    blob_id TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cid_stats (
    cid TEXT PRIMARY KEY, total_requests INTEGER DEFAULT 0, cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0, hit_rate REAL DEFAULT 0, avg_latency REAL DEFAULT 0,
    first_access TEXT, last_access TEXT NOT NULL, total_bytes_served INTEGER DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS geo_stats (
    region TEXT PRIMARY KEY, request_count INTEGER DEFAULT 0, updated_at TEXT NOT NULL
  );
`

// Store ref to sqlite for cleanup
let sqliteRef: any = null

export function clearTestDb() {
  if (!sqliteRef) return
  const tables = ['deploy_files', 'deploy_entries', 'cid_gate_mapping', 'access_gates',
    'token_limits', 'token_usage', 'api_tokens', 'users', 'cid_stats', 'geo_stats']
  for (const t of tables) {
    sqliteRef.prepare(`DELETE FROM ${t}`).run()
  }
}

vi.mock('../db/index.js', async () => {
  const realSchema = await vi.importActual('../db/schema.js') as Record<string, unknown>

  const sqlite = new BetterSqlite3(':memory:')
  sqliteRef = sqlite
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(DDL)

  const testDb = drizzle(sqlite, { schema: realSchema as any })

  return {
    db: testDb,
    schema: realSchema,
    initializeDatabase: () => {},
    closeDatabase: () => sqlite.close(),
  }
})
