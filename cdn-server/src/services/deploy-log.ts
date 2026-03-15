/**
 * Deploy log and rollback service.
 * Tracks deployments via manifests and supports rollback to previous versions.
 */

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
  /** In-memory deploy history (per-site, ordered newest first) */
  private deploys = new Map<string, Array<DeployEntry>>()

  /**
   * Record a new deployment.
   */
  record(entry: Omit<DeployEntry, 'id' | 'status'>): DeployEntry {
    const id = `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const deploy: DeployEntry = { ...entry, id, status: 'active' }

    const siteHistory = this.deploys.get(entry.site) || []

    // Mark previous active deploy as superseded
    for (const prev of siteHistory) {
      if (prev.status === 'active') {
        prev.status = 'superseded'
      }
    }

    siteHistory.unshift(deploy)

    // Keep last 50 deploys per site
    if (siteHistory.length > 50) {
      siteHistory.length = 50
    }

    this.deploys.set(entry.site, siteHistory)
    return deploy
  }

  /**
   * List deployments for a site.
   */
  list(site: string, limit = 20): Array<DeployEntry> {
    const history = this.deploys.get(site) || []
    return history.slice(0, limit)
  }

  /**
   * List all sites with their latest deployment.
   */
  listSites(): Array<{ site: string; latestDeploy: DeployEntry }> {
    const sites: Array<{ site: string; latestDeploy: DeployEntry }> = []
    for (const [site, history] of this.deploys) {
      if (history.length > 0) {
        sites.push({ site, latestDeploy: history[0] })
      }
    }
    return sites
  }

  /**
   * Get a specific deployment by ID.
   */
  get(deployId: string): DeployEntry | null {
    for (const history of this.deploys.values()) {
      const found = history.find((d) => d.id === deployId)
      if (found) return found
    }
    return null
  }

  /**
   * Get the current active deployment for a site.
   */
  getActive(site: string): DeployEntry | null {
    const history = this.deploys.get(site) || []
    return history.find((d) => d.status === 'active') || null
  }

  /**
   * Rollback to a previous deployment.
   * Marks current as rolled_back, reactivates the target deploy,
   * and preloads the target's blobs into cache.
   */
  async rollback(
    site: string,
    targetDeployId: string,
  ): Promise<{ success: boolean; deploy?: DeployEntry; error?: string }> {
    const history = this.deploys.get(site)
    if (!history) {
      return { success: false, error: 'Site not found' }
    }

    const target = history.find((d) => d.id === targetDeployId)
    if (!target) {
      return { success: false, error: 'Deploy not found' }
    }

    // Mark current active as rolled_back
    for (const deploy of history) {
      if (deploy.status === 'active') {
        deploy.status = 'rolled_back'
      }
    }

    // Reactivate target
    target.status = 'active'

    // Preload target's blobs into cache
    try {
      const blobIds = target.files.map((f) => f.blobId)
      await cacheService.warmCache(blobIds)
    } catch {
      // Cache warming is best-effort
    }

    return { success: true, deploy: target }
  }
}

export const deployLogService = new DeployLogService()
