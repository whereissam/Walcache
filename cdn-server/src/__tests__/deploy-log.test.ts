import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../config/index.js', () => ({
  config: {
    REDIS_URL: 'redis://localhost:6379',
    CACHE_TTL: 60,
    MAX_CACHE_SIZE: 10,
    WALRUS_EPOCH_DURATION: 300,
    CACHE_PERSISTENCE_DIR: './data/cache-test',
    ENABLE_CACHE_PERSISTENCE: false,
  },
}))

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockRejectedValue(new Error('no redis')),
    disconnect: vi.fn(),
    on: vi.fn(),
  })),
}))

import { DeployLogService } from '../services/deploy-log.js'

describe('DeployLogService', () => {
  let service: DeployLogService

  beforeEach(() => {
    service = new DeployLogService()
  })

  const baseDeploy = {
    site: 'my-app',
    version: '1.0.0',
    manifestBlobId: 'manifest-blob-1',
    files: [
      { path: 'index.html', blobId: 'blob-1', size: 1024 },
      { path: 'app.js', blobId: 'blob-2', size: 5000 },
    ],
    entrypoint: 'blob-1',
    deployedAt: new Date().toISOString(),
  }

  it('should record a deployment', () => {
    const deploy = service.record(baseDeploy)

    expect(deploy.id).toBeDefined()
    expect(deploy.site).toBe('my-app')
    expect(deploy.status).toBe('active')
    expect(deploy.files.length).toBe(2)
  })

  it('should list deployments for a site', () => {
    service.record(baseDeploy)
    service.record({ ...baseDeploy, version: '1.1.0' })

    const list = service.list('my-app')
    expect(list.length).toBe(2)
    expect(list[0].version).toBe('1.1.0') // Newest first
  })

  it('should mark previous deploy as superseded', () => {
    const first = service.record(baseDeploy)
    service.record({ ...baseDeploy, version: '1.1.0' })

    const list = service.list('my-app')
    const firstUpdated = list.find((d) => d.id === first.id)
    expect(firstUpdated!.status).toBe('superseded')
  })

  it('should get active deployment', () => {
    service.record(baseDeploy)
    service.record({ ...baseDeploy, version: '1.1.0' })

    const active = service.getActive('my-app')
    expect(active).not.toBeNull()
    expect(active!.version).toBe('1.1.0')
  })

  it('should rollback to a previous deployment', async () => {
    const first = service.record(baseDeploy)
    service.record({ ...baseDeploy, version: '1.1.0' })

    const result = await service.rollback('my-app', first.id)
    expect(result.success).toBe(true)
    expect(result.deploy!.version).toBe('1.0.0')
    expect(result.deploy!.status).toBe('active')

    const active = service.getActive('my-app')
    expect(active!.id).toBe(first.id)
  })

  it('should fail rollback for unknown site', async () => {
    const result = await service.rollback('unknown', 'fake-id')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Site not found')
  })

  it('should fail rollback for unknown deploy', async () => {
    service.record(baseDeploy)
    const result = await service.rollback('my-app', 'fake-id')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Deploy not found')
  })

  it('should list all sites', () => {
    service.record(baseDeploy)
    service.record({ ...baseDeploy, site: 'other-app' })

    const sites = service.listSites()
    expect(sites.length).toBe(2)
  })

  it('should get deploy by ID', () => {
    const deploy = service.record(baseDeploy)
    const found = service.get(deploy.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(deploy.id)
  })
})
