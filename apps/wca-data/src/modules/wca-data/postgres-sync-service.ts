import type { Clock } from '../../shared/time/clock.js'
import { systemClock } from '../../shared/time/system-clock.js'
import { YauzlZipReader } from '../../infra/archive/yauzl-zip-reader.js'
import type { ZipReader } from '../../infra/archive/zip-reader.js'
import type { WcaExportClient } from '../../infra/http/wca-export-client.js'
import type { WcaImportExecutionLock } from './import/import-execution-lock.js'
import { createCleanupImportArtifactsService } from './import/cleanup-import-artifacts.service.js'
import { createCleanupInactiveDatasetsService } from './import/cleanup-inactive-datasets.service.js'
import { createCleanupWcaStagingService } from './import/cleanup-wca-staging.service.js'
import { createDownloadWcaExportService } from './import/download-wca-export.service.js'
import { createExtractWcaExportService } from './import/extract-wca-export.service.js'
import { createLoadWcaStagingService, type WcaStagingLoader } from './import/load-wca-staging.service.js'
import { createSyncWcaExportService, type SyncWcaExportService } from './import/sync-wca-export.service.js'
import { createTransformGeneralCanonicalService } from './import/transform-general-canonical.service.js'
import {
  createDownloadedWcaSourceFilesService,
  type WcaSourceFilesService,
} from './import/wca-source-files.service.js'
import { createLocalWcaSyncCycleService } from './import/wca-sync-cycle.service.js'
import { createPublishDatasetService } from './publish/publish-dataset.service.js'
import { PostgresDatasetPublisher } from './persistence/postgres/postgres-dataset-publisher.js'
import type { TransactionalQueryPool } from './persistence/postgres/postgres-dataset-publisher.js'
import { PostgresDatasetRepository } from './persistence/postgres/postgres-dataset.repository.js'
import { PostgresGeneralCanonicalTransformer } from './persistence/postgres/postgres-general-canonical-transformer.js'
import { PostgresImportRunRepository } from './persistence/postgres/postgres-import-run.repository.js'
import { PostgresPoolCopyStagingLoader, type CopyQueryPool } from './persistence/postgres/postgres-copy-staging-loader.js'
import { PostgresWcaStagingCleaner } from './persistence/postgres/postgres-wca-staging-cleaner.js'
import type { Queryable } from './persistence/postgres/queryable.js'

export type CreatePostgresSyncWcaExportServiceInput = {
  clock?: Clock
  copyPool?: CopyQueryPool
  db: Queryable
  exportClient: WcaExportClient
  importLock: WcaImportExecutionLock
  sourceFiles?: WcaSourceFilesService
  stagingLoader?: WcaStagingLoader
  storageRootDir: string
  transactionPool: TransactionalQueryPool
  zipReader?: ZipReader
}

export function createPostgresSyncWcaExportService({
  clock = systemClock,
  copyPool,
  db,
  exportClient,
  importLock,
  sourceFiles,
  stagingLoader,
  storageRootDir,
  transactionPool,
  zipReader = new YauzlZipReader(),
}: CreatePostgresSyncWcaExportServiceInput): SyncWcaExportService {
  const datasets = new PostgresDatasetRepository(db)
  const importRuns = new PostgresImportRunRepository(db)
  const resolvedStagingLoader = stagingLoader ?? copyStagingLoader(copyPool)
  const resolvedSourceFiles = sourceFiles ?? createDownloadedWcaSourceFilesService({
    download: createDownloadWcaExportService({ storageRootDir }),
    extract: createExtractWcaExportService({ storageRootDir, zipReader }),
  })

  return createSyncWcaExportService({
    clock,
    datasets,
    exportClient,
    importLock,
    importRuns,
    syncCycle: createLocalWcaSyncCycleService({
      cleanupImportArtifacts: createCleanupImportArtifactsService({ storageRootDir }),
      cleanupInactiveDatasets: createCleanupInactiveDatasetsService({ datasetVersions: datasets }),
      cleanupWcaStaging: createCleanupWcaStagingService({ cleaner: new PostgresWcaStagingCleaner(db) }),
      clock,
      datasetVersions: datasets,
      importRuns,
      loadStaging: createLoadWcaStagingService(resolvedStagingLoader),
      publishDataset: createPublishDatasetService({
        clock,
        publisher: new PostgresDatasetPublisher(transactionPool),
      }),
      runMode: 'postgres-import-publish',
      sourceFiles: resolvedSourceFiles,
      transformGeneral: createTransformGeneralCanonicalService(new PostgresGeneralCanonicalTransformer(db)),
    }),
  })
}

function copyStagingLoader(copyPool: CopyQueryPool | undefined): WcaStagingLoader {
  if (copyPool === undefined) {
    throw new Error('copyPool is required when stagingLoader is not provided')
  }

  return new PostgresPoolCopyStagingLoader(copyPool)
}
