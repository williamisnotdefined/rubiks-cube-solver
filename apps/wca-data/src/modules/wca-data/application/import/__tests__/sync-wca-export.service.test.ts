import { describe, expect, it } from 'vitest'
import type { DatasetMetadata } from '../../../domain/dataset-metadata.js'
import type { WcaExportMetadata } from '../../../domain/export-metadata.js'
import { InMemoryDatasetRepository } from '../../../persistence/in-memory-dataset.repository.js'
import { InMemoryImportRunRepository } from '../../../persistence/in-memory-import-run.repository.js'
import { createSyncWcaExportService } from '../sync-wca-export.service.js'

describe('SyncWcaExportService', () => {
  it('records a skipped import run when the active dataset already uses the remote export', async () => {
    const importRuns = new InMemoryImportRunRepository(() => 'run-1')
    const service = createSyncWcaExportService({
      clock: { now: () => new Date('2026-06-30T12:00:00Z') },
      datasets: new InMemoryDatasetRepository(activeDataset()),
      exportClient: { getPublicExportMetadata: async () => remoteMetadata() },
      importRuns,
    })

    await expect(service.execute({ force: false, reason: 'manual' })).resolves.toMatchObject({
      activeDataset: activeDataset(),
      importRun: {
        finishedAt: '2026-06-30T12:00:00.000Z',
        id: 'run-1',
        remoteExportDate: '2026-06-30T00:00:16Z',
        status: 'skipped',
      },
      status: 'skipped',
    })
    expect(importRuns.records).toHaveLength(1)
  })

  it('does not skip when force is enabled', async () => {
    const importRuns = new InMemoryImportRunRepository(() => 'run-1')
    const service = createSyncWcaExportService({
      clock: { now: () => new Date('2026-06-30T12:00:00Z') },
      datasets: new InMemoryDatasetRepository(activeDataset()),
      exportClient: { getPublicExportMetadata: async () => remoteMetadata() },
      importRuns,
    })

    await expect(service.execute({ force: true, reason: 'manual' })).resolves.toMatchObject({
      activeDataset: activeDataset(),
      status: 'new_export_detected',
    })
    expect(importRuns.records).toHaveLength(0)
  })

  it('reports a new export when there is no active dataset', async () => {
    const service = createSyncWcaExportService({
      clock: { now: () => new Date('2026-06-30T12:00:00Z') },
      datasets: new InMemoryDatasetRepository(null),
      exportClient: { getPublicExportMetadata: async () => remoteMetadata() },
      importRuns: new InMemoryImportRunRepository(() => 'run-1'),
    })

    await expect(service.execute({ force: false, reason: 'manual' })).resolves.toMatchObject({
      activeDataset: null,
      status: 'new_export_detected',
    })
  })
})

function activeDataset(): DatasetMetadata {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportVersion: 'v2.0.2',
    id: 'dataset-1',
    publishedAt: '2026-06-30T04:58:00Z',
  }
}

function remoteMetadata(): WcaExportMetadata {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: 200,
    sqlUrl: 'https://www.worldcubeassociation.org/export/results/v2/sql',
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
