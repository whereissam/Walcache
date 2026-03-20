/**
 * Deploy log and rollback service.
 * Tracks deployments via manifests and supports rollback to previous versions.
 * Persisted to SQLite via Drizzle ORM.
 */

import { eq, desc, and } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { cacheService } from './cache.js'

export interface DeployEntry {
  id: string
  site: string
  version: string
  manifestBlobId: string
  files: Array<{ path: string; blobId: string; size: number }>
  entrypoint?: string
  deployedAt: string
  status: 'active' | 'rolled_back' | 'superseded'
}

export class DeployLogService {
  record(entry: Omit<DeployEntry, 'id' | 'status'>): DeployEntry {
    const id = `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    // Mark previous active deploys for this site as superseded
    db.update(schema.deployEntries)
      .set({ status: 'superseded' })
      .where(
        and(
          eq(schema.deployEntries.site, entry.site),
          eq(schema.deployEntries.status, 'active'),
        ),
      )
      .run()

    // Insert the new deploy entry
    db.insert(schema.deployEntries)
      .values({
        id,
        site: entry.site,
        version: entry.version,
        manifestBlobId: entry.manifestBlobId,
        entrypoint: entry.entrypoint,
        status: 'active',
        deployedAt: entry.deployedAt,
        createdAt: now,
      })
      .run()

    // Insert deploy files
    for (const file of entry.files) {
      const fileId = `df_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      db.insert(schema.deployFiles)
        .values({
          id: fileId,
          deployId: id,
          path: file.path,
          blobId: file.blobId,
          size: file.size,
          createdAt: now,
        })
        .run()
    }

    return { ...entry, id, status: 'active' }
  }

  list(site: string, limit = 20): Array<DeployEntry> {
    const rows = db
      .select()
      .from(schema.deployEntries)
      .where(eq(schema.deployEntries.site, site))
      .orderBy(desc(schema.deployEntries.createdAt))
      .limit(limit)
      .all()

    return rows.map((row) => this.buildDeployEntry(row))
  }

  listSites(): Array<{ site: string; latestDeploy: DeployEntry }> {
    // Get distinct sites with their latest deploy
    const allDeploys = db
      .select()
      .from(schema.deployEntries)
      .orderBy(desc(schema.deployEntries.createdAt))
      .all()

    const siteMap = new Map<string, typeof allDeploys[0]>()
    for (const deploy of allDeploys) {
      if (!siteMap.has(deploy.site)) {
        siteMap.set(deploy.site, deploy)
      }
    }

    return Array.from(siteMap.entries()).map(([site, row]) => ({
      site,
      latestDeploy: this.buildDeployEntry(row),
    }))
  }

  get(deployId: string): DeployEntry | null {
    const row = db
      .select()
      .from(schema.deployEntries)
      .where(eq(schema.deployEntries.id, deployId))
      .get()

    return row ? this.buildDeployEntry(row) : null
  }

  getActive(site: string): DeployEntry | null {
    const row = db
      .select()
      .from(schema.deployEntries)
      .where(
        and(
          eq(schema.deployEntries.site, site),
          eq(schema.deployEntries.status, 'active'),
        ),
      )
      .get()

    return row ? this.buildDeployEntry(row) : null
  }

  async rollback(
    site: string,
    targetDeployId: string,
  ): Promise<{ success: boolean; deploy?: DeployEntry; error?: string }> {
    const target = db
      .select()
      .from(schema.deployEntries)
      .where(eq(schema.deployEntries.id, targetDeployId))
      .get()

    if (!target || target.site !== site) {
      return { success: false, error: 'Deploy not found' }
    }

    // Mark current active as rolled_back
    db.update(schema.deployEntries)
      .set({ status: 'rolled_back' })
      .where(
        and(
          eq(schema.deployEntries.site, site),
          eq(schema.deployEntries.status, 'active'),
        ),
      )
      .run()

    // Reactivate target
    db.update(schema.deployEntries)
      .set({ status: 'active' })
      .where(eq(schema.deployEntries.id, targetDeployId))
      .run()

    const deployEntry = this.buildDeployEntry(target)

    // Preload target's blobs into cache (best-effort)
    try {
      const blobIds = deployEntry.files.map((f) => f.blobId)
      await cacheService.warmCache(blobIds)
    } catch {
      // Cache warming is best-effort
    }

    return { success: true, deploy: { ...deployEntry, status: 'active' } }
  }

  private buildDeployEntry(
    row: typeof schema.deployEntries.$inferSelect,
  ): DeployEntry {
    const files = db
      .select()
      .from(schema.deployFiles)
      .where(eq(schema.deployFiles.deployId, row.id))
      .all()

    return {
      id: row.id,
      site: row.site,
      version: row.version,
      manifestBlobId: row.manifestBlobId,
      entrypoint: row.entrypoint || undefined,
      deployedAt: row.deployedAt,
      status: row.status as DeployEntry['status'],
      files: files.map((f) => ({
        path: f.path,
        blobId: f.blobId,
        size: f.size,
      })),
    }
  }
}

export const deployLogService = new DeployLogService()
