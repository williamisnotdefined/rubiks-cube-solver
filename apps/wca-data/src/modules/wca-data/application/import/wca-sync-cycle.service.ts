import type { Clock } from '../../../../shared/time/clock.js'
import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type { WcaExportMetadata } from '../../domain/export-metadata.js'
import type { ImportRunReason, ImportRunRecord } from '../../domain/import-run.js'
import type { DatasetVersionRepository, ImportRunRepository } from '../../persistence/repositories.js'
import type { LoadWcaStagingResult, LoadWcaStagingService } from './load-wca-staging.service.js'
import type { GeneralCanonicalTransformCounts, TransformGeneralCanonicalService } from './transform-general-canonical.service.js'
import type { WcaSourceFilesService } from './wca-source-files.service.js'
import type { PublishDatasetResult, PublishDatasetService } from '../publish/publish-dataset.service.js'
import type { CleanupImportArtifactsResult, CleanupImportArtifactsService } from './cleanup-import-artifacts.service.js'

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
        const cleanup = await cleanupImportArtifactsLog(cleanupImportArtifacts, importRun.id)
        const publishedRun = await importRuns.updateStatus({
          id: importRun.id,
          log: { ...(cleanup === undefined ? {} : { cleanup }), publish },
          now: clock.now(),
          status: 'published',
        })

        return {
          dataset: { ...publishedDataset, publishedAt: publish.publishedAt },
          importRun: publishedRun,
          publish,
          staging,
          status: 'published',
          transform,
        }
      } catch (error) {
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
