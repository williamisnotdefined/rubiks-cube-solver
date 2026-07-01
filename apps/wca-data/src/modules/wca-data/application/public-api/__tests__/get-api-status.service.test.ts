import { describe, expect, it } from 'vitest'
import type { ImportRunRecord } from '../../../domain/import-run.js'
import { InMemoryDatasetRepository } from '../../../persistence/in-memory-dataset.repository.js'
import { createGetApiStatusService } from '../get-api-status.service.js'
import type { DatasetRecordCounts } from '../../../persistence/repositories.js'

describe('GetApiStatusService', () => {
  it('reports the active dataset when available', async () => {
    const service = createGetApiStatusService({
      clock: { now: () => new Date('2026-07-01T04:58:10Z') },
      datasetMetrics: new InMemoryDatasetRepository(null, { 'dataset-1': counts() }),
      datasets: new InMemoryDatasetRepository({
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'dataset-1',
        publishedAt: '2026-06-30T04:58:00Z',
      }),
      scheduler: scheduler(),
    })

    await expect(service.execute()).resolves.toEqual({
      activeDataset: {
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'dataset-1',
        publishedAt: '2026-06-30T04:58:00Z',
      },
      lastImportRun: null,
      metrics: {
        activeDataset: {
          counts: counts(),
          exportAgeSeconds: 104_274,
          publishDelaySeconds: 17_864,
          publishedAgeSeconds: 86_410,
        },
        checkedAt: '2026-07-01T04:58:10.000Z',
      },
      scheduler: scheduler(),
      source: { official: false, provider: 'World Cube Association Results Export' },
      status: 'ok',
    })
  })

  it('reports dataset_unavailable when no active dataset exists', async () => {
    const service = createGetApiStatusService({
      clock: { now: () => new Date('2026-07-01T04:58:10Z') },
      datasets: new InMemoryDatasetRepository(null),
      scheduler: scheduler(),
    })

    await expect(service.execute()).resolves.toMatchObject({
      activeDataset: null,
      metrics: { activeDataset: null, checkedAt: '2026-07-01T04:58:10.000Z' },
      status: 'dataset_unavailable',
    })
  })

  it('reports the latest import run when available', async () => {
    const lastImportRun: ImportRunRecord = {
      datasetId: 'dataset-1',
      errorCode: null,
      errorMessage: null,
      finishedAt: '2026-06-30T12:05:00.000Z',
      id: 'run-1',
      log: { stagingRows: 4 },
      reason: 'manual',
      remoteExportDate: '2026-06-30T00:00:16.000Z',
      remoteExportVersion: 'v2.0.2',
      startedAt: '2026-06-30T12:00:00.000Z',
      status: 'published',
    }
    const service = createGetApiStatusService({
      datasets: new InMemoryDatasetRepository({
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'dataset-1',
        publishedAt: '2026-06-30T04:58:00Z',
      }),
      importRuns: { getLastImportRun: async () => lastImportRun },
      scheduler: scheduler(),
    })

    await expect(service.execute()).resolves.toMatchObject({
      lastImportRun: { id: 'run-1', status: 'published' },
      status: 'ok',
    })
  })
})

function scheduler() {
  return { cron: '30 4 * * *', enabled: true, timezone: 'UTC' }
}

function counts(): DatasetRecordCounts {
  return {
    championships: 1,
    competitions: 3,
    continents: 2,
    countries: 2,
    events: 2,
    formats: 1,
    persons: 4,
    ranksAverage: 1,
    ranksSingle: 1,
    resultAttempts: 13,
    results: 3,
    roundTypes: 1,
    scrambles: 1,
    totalRows: 35,
  }
}
