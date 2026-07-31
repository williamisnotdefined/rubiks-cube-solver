import type { Clock } from '../../../shared/time/clock.js'
import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'
import type { ImportRunReason, ImportRunRecord } from '../domain/import-run.js'
import type { DatasetVersionRepository, ImportRunRepository } from '../repositories/wca-data.repositories.js'
import type { LoadWcaStagingResult, LoadWcaStagingService } from './load-wca-staging.service.js'
import type { GeneralCanonicalTransformCounts, TransformGeneralCanonicalService } from './transform-general-canonical.service.js'
import type { WcaSourceFilesService } from './wca-source-files.service.js'
import type { PublishDatasetResult, PublishDatasetService } from '../publish/publish-dataset.service.js'
import type { CleanupImportArtifactsResult, CleanupImportArtifactsService } from './cleanup-import-artifacts.service.js'
import type { CleanupInactiveDatasetsResult, CleanupInactiveDatasetsService } from './cleanup-inactive-datasets.service.js'
import type { CleanupWcaStagingResult, CleanupWcaStagingService } from './cleanup-wca-staging.service.js'

export type WcaSyncCycleInput = {
  activeDataset: DatasetMetadata | null
  reason: ImportRunReason
  remote: WcaExportMetadata
}

export type WcaSyncCycleResult = {
  dataset: DatasetMetadata
  importRun: ImportRunRecord
  publish: PublishDatasetResult
  staging: LoadWcaStagingResult
  status: 'published'
  transform: GeneralCanonicalTransformCounts
}

export type WcaSyncCycleService = {
  execute: (input: WcaSyncCycleInput) => Promise<WcaSyncCycleResult>
}

type LocalWcaSyncCycleServiceDeps = {
  cleanupImportArtifacts?: CleanupImportArtifactsService
  cleanupInactiveDatasets?: CleanupInactiveDatasetsService
  cleanupWcaStaging?: CleanupWcaStagingService
  clock: Clock
  datasetVersions: DatasetVersionRepository
  importRuns: ImportRunRepository
  loadStaging: LoadWcaStagingService
  publishDataset: PublishDatasetService
  runMode?: string
  sourceFiles: WcaSourceFilesService
  transformGeneral: TransformGeneralCanonicalService
}

export function createLocalWcaSyncCycleService({
  cleanupImportArtifacts,
  cleanupInactiveDatasets,
  cleanupWcaStaging,
  clock,
  datasetVersions,
  importRuns,
  loadStaging,
  publishDataset,
  runMode = 'import-publish',
  sourceFiles,
  transformGeneral,
}: LocalWcaSyncCycleServiceDeps): WcaSyncCycleService {
  return {
    async execute(input: WcaSyncCycleInput): Promise<WcaSyncCycleResult> {
      const importRun = await importRuns.startChecking({
        log: { mode: runMode },
        now: clock.now(),
        reason: input.reason,
      })
      let datasetId: string | null = null
      let published = false

      try {
        const datasetVersion = await datasetVersions.createBuilding({
          metadata: { previousActiveDatasetId: input.activeDataset?.id ?? null },
          remote: input.remote,
        })
        datasetId = datasetVersion.id

        await importRuns.updateStatus({
          datasetId,
          id: importRun.id,
          log: { datasetId },
          now: clock.now(),
          remote: input.remote,
          status: 'running',
        })

        const preparedSourceFiles = await sourceFiles.execute({ importRunId: importRun.id, remote: input.remote })
        const staging = await loadStaging.execute({ files: preparedSourceFiles.files, importRunId: importRun.id })
        const transform = await transformGeneral.execute({ datasetId, importRunId: importRun.id })

        await importRuns.updateStatus({
          id: importRun.id,
          log: { sourceFiles: preparedSourceFiles.log, stagingRows: staging.totalRows, transform },
          now: clock.now(),
          status: 'imported',
        })

        const publishedDataset: DatasetMetadata = {
          exportDate: datasetVersion.exportDate,
          exportVersion: datasetVersion.exportVersion,
          id: datasetId,
          publishedAt: datasetVersion.publishedAt ?? datasetVersion.exportDate,
        }
        await datasetVersions.updateStatus({
          datasetId,
          metadata: { transform },
          status: 'ready',
        })

        const publish = await publishDataset.execute({ datasetId })
        published = true
        const cleanup = await cleanupImportArtifactsLog(cleanupImportArtifacts, importRun.id)
        const publishedRun = await importRuns.updateStatus({
          id: importRun.id,
          log: { ...(cleanup === undefined ? {} : { cleanup }), publish },
          now: clock.now(),
          status: 'published',
        })
        const postPublishCleanup = await postPublishCleanupLog({ cleanupInactiveDatasets, cleanupWcaStaging })
        const completedRun = await recordPostPublishCleanup({
          cleanup: postPublishCleanup,
          clock,
          importRuns,
          publishedRun,
        })

        return {
          dataset: { ...publishedDataset, publishedAt: publish.publishedAt },
          importRun: completedRun,
          publish,
          staging,
          status: 'published',
          transform,
        }
      } catch (error) {
        if (published) {
          throw error
        }

        const cleanup = await cleanupImportArtifactsLog(cleanupImportArtifacts, importRun.id)
        await importRuns.markFailed({
          errorCode: errorCode(error),
          errorMessage: error instanceof Error ? error.message : 'WCA sync cycle failed',
          id: importRun.id,
          ...(cleanup === undefined ? {} : { log: { cleanup } }),
          now: clock.now(),
        })

        if (datasetId !== null) {
          await datasetVersions.updateStatus({
            datasetId,
            metadata: { errorCode: errorCode(error) },
            status: 'failed',
          })
        }

        throw error
      }
    },
  }
}

async function recordPostPublishCleanup({
  cleanup,
  clock,
  importRuns,
  publishedRun,
}: {
  cleanup: PostPublishCleanupLog
  clock: Clock
  importRuns: ImportRunRepository
  publishedRun: ImportRunRecord
}): Promise<ImportRunRecord> {
  try {
    return await importRuns.updateStatus({
      id: publishedRun.id,
      log: { postPublishCleanup: cleanup },
      now: clock.now(),
      status: 'published',
    })
  } catch {
    return publishedRun
  }
}

type PostPublishCleanupLog = {
  inactiveDatasets?: CleanupInactiveDatasetsResult | CleanupFailure
  staging?: CleanupWcaStagingResult | CleanupFailure
}

type CleanupFailure = {
  error: string
  status: 'failed'
}

async function postPublishCleanupLog({
  cleanupInactiveDatasets,
  cleanupWcaStaging,
}: {
  cleanupInactiveDatasets: CleanupInactiveDatasetsService | undefined
  cleanupWcaStaging: CleanupWcaStagingService | undefined
}): Promise<PostPublishCleanupLog> {
  const [inactiveDatasets, staging] = await Promise.all([
    cleanupLog(cleanupInactiveDatasets),
    cleanupLog(cleanupWcaStaging),
  ])

  return {
    ...(inactiveDatasets === undefined ? {} : { inactiveDatasets }),
    ...(staging === undefined ? {} : { staging }),
  }
}

async function cleanupLog<T extends object>(
  cleanup: { execute: () => Promise<T> } | undefined,
): Promise<T | CleanupFailure | undefined> {
  if (cleanup === undefined) {
    return undefined
  }

  try {
    return await cleanup.execute()
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Post-publication cleanup failed',
      status: 'failed',
    }
  }
}

type CleanupImportArtifactsLog = CleanupImportArtifactsResult | {
  error: string
  status: 'failed'
}

async function cleanupImportArtifactsLog(
  cleanupImportArtifacts: CleanupImportArtifactsService | undefined,
  importRunId: string,
): Promise<CleanupImportArtifactsLog | undefined> {
  if (cleanupImportArtifacts === undefined) {
    return undefined
  }

  try {
    return await cleanupImportArtifacts.execute({ importRunId })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to clean import artifacts',
      status: 'failed',
    }
  }
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }

  return 'wca_sync_cycle_failed'
}
