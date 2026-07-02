import type { Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { loadEnv, requireDatabaseEnv } from '../../config/env.js'
import type { WcaExportClient } from '../../infra/http/wca-export-client.js'
import type { CreatePostgresSyncWcaExportServiceInput } from '../../modules/wca-data/postgres-sync-service.js'
import { startWcaDataWorkerRuntime, type WcaDataWorkerDatabase } from '../worker-runtime.js'
import { syncWcaExportJobName, type WcaDataBoss } from '../sync-worker.js'

describe('startWcaDataWorkerRuntime', () => {
  it('composes pg-boss, Postgres pool, export client, and sync service', async () => {
    const boss = new FakeBoss()
    const database = new FakeDatabase()
    const exportClient: WcaExportClient = { getPublicExportMetadata: vi.fn(async () => remoteMetadata()) }
    const syncWcaExport = {
      execute: vi.fn(async () => ({ activeDataset: null, remote: remoteMetadata(), status: 'new_export_detected' as const })),
    }
    const syncWcaExportFactory = vi.fn((_input: CreatePostgresSyncWcaExportServiceInput) => syncWcaExport)

    const worker = await startWcaDataWorkerRuntime({
      env: testEnv(),
      exportClientFactory: (metadataUrl) => {
        expect(metadataUrl).toBe('https://example.test/wca-export')
        return exportClient
      },
      logger: silentLogger(),
      pgBossFactory: () => boss,
      pgPoolFactory: () => database,
      syncWcaExportFactory,
    })

    expect(worker.workId).toBe('worker-1')
    expect(syncWcaExportFactory).toHaveBeenCalledWith(expect.objectContaining({
      copyPool: database,
      db: database,
      exportClient,
      storageRootDir: '/tmp/wca-data-test-storage',
    }))
    await expect(boss.runRegisteredHandler([{ data: { force: true, reason: 'manual' }, id: 'job-1' }])).resolves.toMatchObject({
      jobCount: 1,
      status: 'completed',
    })
    expect(syncWcaExport.execute).toHaveBeenCalledWith({ force: true, reason: 'manual' })

    await worker.stop()
    expect(database.endCalls).toBe(1)
  })

  it('closes the Postgres pool when worker startup fails', async () => {
    const database = new FakeDatabase()

    await expect(startWcaDataWorkerRuntime({
      env: testEnv(),
      exportClientFactory: () => ({ getPublicExportMetadata: vi.fn(async () => remoteMetadata()) }),
      logger: silentLogger(),
      pgBossFactory: () => new FailingBoss(),
      pgPoolFactory: () => database,
      syncWcaExportFactory: () => ({ execute: vi.fn(async () => ({ activeDataset: null, remote: remoteMetadata(), status: 'new_export_detected' as const })) }),
    })).rejects.toThrow('boss start failed')
    expect(database.endCalls).toBe(1)
  })
})

class FakeDatabase implements WcaDataWorkerDatabase {
  endCalls = 0

  async connect(): Promise<{ query: (query: string | Writable, params?: unknown[]) => unknown; release: () => void }> {
    return { query: () => undefined, release: () => undefined }
  }

  async end(): Promise<void> {
    this.endCalls += 1
  }

  async query<TRow = Record<string, unknown>>(_sql: string, _params?: unknown[]): Promise<{ rows: TRow[] }> {
    return { rows: [] }
  }
}

class FakeBoss implements WcaDataBoss {
  private handler: ((jobs: Array<{ data: unknown; id: string }>) => Promise<unknown>) | undefined

  async createQueue(): Promise<void> {}

  async schedule(): Promise<void> {}

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async work<ReqData, ResData>(name: string, handler: (jobs: Array<{ data: ReqData; id: string }>) => Promise<ResData>): Promise<string> {
    expect(name).toBe(syncWcaExportJobName)
    this.handler = handler as (jobs: Array<{ data: unknown; id: string }>) => Promise<unknown>
    return 'worker-1'
  }

  async runRegisteredHandler(jobs: Array<{ data: unknown; id: string }>): Promise<unknown> {
    if (this.handler === undefined) {
      throw new Error('handler was not registered')
    }

    return this.handler(jobs)
  }
}

class FailingBoss extends FakeBoss {
  override async start(): Promise<void> {
    throw new Error('boss start failed')
  }
}

function silentLogger() {
  return { error: vi.fn(), info: vi.fn() }
}

function testEnv() {
  return requireDatabaseEnv(loadEnv({
    WCA_DATA_DATABASE_URL: 'postgres://localhost/wca',
    WCA_DATA_NODE_ENV: 'test',
    WCA_DATA_STORAGE_DIR: '/tmp/wca-data-test-storage',
    WCA_DATA_WCA_EXPORT_METADATA_URL: 'https://example.test/wca-export',
  }))
}

function remoteMetadata() {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: null,
    sqlUrl: null,
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
