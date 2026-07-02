import { describe, expect, it } from 'vitest'
import type { WcaExportMetadata } from '../../../domain/export-metadata.js'
import { InMemoryDatasetVersionRepository } from '../../../persistence/in-memory-dataset-version.repository.js'
import { InMemoryImportRunRepository } from '../../../persistence/in-memory-import-run.repository.js'
import { createPublishDatasetService } from '../../publish/publish-dataset.service.js'
import { createStaticWcaSourceFilesService } from '../wca-source-files.service.js'
import { createLocalWcaSyncCycleService } from '../wca-sync-cycle.service.js'

describe('WcaSyncCycleService', () => {
  it('runs the import/transform/publish lifecycle and publishes the new dataset', async () => {
    const clock = { now: () => new Date('2026-06-30T12:00:00Z') }
    const datasetVersions = new InMemoryDatasetVersionRepository(() => 'dataset-1')
    const importRuns = new InMemoryImportRunRepository(() => 'run-1')
    const service = createLocalWcaSyncCycleService({
      cleanupImportArtifacts: {
        execute: async ({ importRunId }) => ({ dryRun: false, existed: true, removed: true, storageKey: `imports/${importRunId}` }),
      },
      clock,
      datasetVersions,
      importRuns,
      loadStaging: {
        execute: async ({ importRunId }) => ({
          files: [{ fileName: 'WCA_export_Continents.tsv', rowCount: 2, stagingTable: 'wca_staging_continents' }],
          totalRows: importRunId === 'run-1' ? 2 : 0,
        }),
      },
      publishDataset: createPublishDatasetService({ clock, publisher: datasetVersions }),
      runMode: 'local-fixture',
      sourceFiles: createStaticWcaSourceFilesService([{ fileName: 'WCA_export_Continents.tsv', localPath: '/tmp/WCA_export_Continents.tsv' }]),
      transformGeneral: {
        execute: async () => ({
          championships: 0,
          championshipEligibleCountries: 2,
          competitions: 1,
          continents: 2,
          countries: 2,
          events: 2,
          formats: 1,
          persons: 1,
          ranksAverage: 1,
          ranksSingle: 1,
          resultAttempts: 3,
          results: 1,
          roundTypes: 1,
          scrambles: 1,
        }),
      },
    })

    await expect(service.execute({
      activeDataset: { exportDate: '2026-06-29T00:00:00Z', exportVersion: 'v2.0.1', id: 'old-dataset', publishedAt: '2026-06-29T01:00:00Z' },
      reason: 'manual',
      remote: remoteMetadata(),
    })).resolves.toMatchObject({
      dataset: {
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'dataset-1',
        publishedAt: '2026-06-30T12:00:00.000Z',
      },
      importRun: {
        datasetId: 'dataset-1',
        finishedAt: '2026-06-30T12:00:00.000Z',
        id: 'run-1',
        remoteExportDate: '2026-06-30T00:00:16Z',
        remoteExportVersion: 'v2.0.2',
        status: 'published',
      },
      publish: {
        publishedAt: '2026-06-30T12:00:00.000Z',
      },
      staging: { totalRows: 2 },
      status: 'published',
      transform: { championships: 0, championshipEligibleCountries: 2, competitions: 1, continents: 2, countries: 2, events: 2, formats: 1, persons: 1, ranksAverage: 1, ranksSingle: 1, resultAttempts: 3, results: 1, roundTypes: 1, scrambles: 1 },
    })
    expect(datasetVersions.records).toMatchObject([{ id: 'dataset-1', isActive: true, status: 'active' }])
    expect(importRuns.records).toHaveLength(1)
    expect(importRuns.records[0]?.log).toMatchObject({
      datasetId: 'dataset-1',
      cleanup: { removed: true, storageKey: 'imports/run-1' },
      mode: 'local-fixture',
      stagingRows: 2,
    })
  })

  it('marks import run and dataset failed when validation fails', async () => {
    const clock = { now: () => new Date('2026-06-30T12:00:00Z') }
    const datasetVersions = new InMemoryDatasetVersionRepository(() => 'dataset-1')
    const importRuns = new InMemoryImportRunRepository(() => 'run-1')
    const service = createLocalWcaSyncCycleService({
      cleanupImportArtifacts: {
        execute: async ({ importRunId }) => ({ dryRun: false, existed: true, removed: true, storageKey: `imports/${importRunId}` }),
      },
      clock,
      datasetVersions,
      importRuns,
      loadStaging: {
        execute: async () => ({ files: [], totalRows: 0 }),
      },
      publishDataset: createPublishDatasetService({ clock, publisher: datasetVersions }),
      sourceFiles: createStaticWcaSourceFilesService([]),
      transformGeneral: {
        execute: async () => {
          throw Object.assign(new Error('Canonical transform failed'), { code: 'canonical_transform_failed' })
        },
      },
    })

    await expect(service.execute({ activeDataset: null, reason: 'manual', remote: remoteMetadata() }))
      .rejects.toThrow('Canonical transform failed')

    expect(importRuns.records).toMatchObject([{
      errorCode: 'canonical_transform_failed',
      errorMessage: 'Canonical transform failed',
      finishedAt: '2026-06-30T12:00:00.000Z',
      id: 'run-1',
      log: { cleanup: { removed: true, storageKey: 'imports/run-1' } },
      status: 'failed',
    }])
    expect(datasetVersions.records).toMatchObject([{
      id: 'dataset-1',
      isActive: false,
      metadata: { errorCode: 'canonical_transform_failed' },
      status: 'failed',
    }])
  })
})

function remoteMetadata(): WcaExportMetadata {
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
