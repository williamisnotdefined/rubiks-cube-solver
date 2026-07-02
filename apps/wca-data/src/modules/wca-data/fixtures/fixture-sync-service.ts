import type { Clock } from '../../../shared/time/clock.js'
import { systemClock } from '../../../shared/time/system-clock.js'
import { createLoadWcaStagingService } from '../import/load-wca-staging.service.js'
import { createSyncWcaExportService, type SyncWcaExportService } from '../import/sync-wca-export.service.js'
import { createTransformGeneralCanonicalService } from '../import/transform-general-canonical.service.js'
import { createStaticWcaSourceFilesService } from '../import/wca-source-files.service.js'
import { createLocalWcaSyncCycleService } from '../import/wca-sync-cycle.service.js'
import { createPublishDatasetService } from '../publish/publish-dataset.service.js'
import { InMemoryDatasetVersionRepository } from '../persistence/memory/in-memory-dataset-version.repository.js'
import { InMemoryImportRunRepository } from '../persistence/memory/in-memory-import-run.repository.js'
import { InMemoryWcaImportRepository } from '../persistence/memory/in-memory-wca-import.repository.js'
import {
  createFixtureWcaExportClient,
  defaultFixtureWcaExportDir,
  fixtureWcaExportFiles,
} from './wca-export-fixture.js'

export type CreateFixtureSyncWcaExportServiceInput = {
  clock?: Clock
  fixtureDir?: string
}

export function createFixtureSyncWcaExportService({
  clock = systemClock,
  fixtureDir = defaultFixtureWcaExportDir(),
}: CreateFixtureSyncWcaExportServiceInput): SyncWcaExportService {
  let datasetSequence = 0
  let importRunSequence = 0
  const datasets = new InMemoryDatasetVersionRepository(() => `fixture-wca-dataset-v${++datasetSequence}`)
  const importRuns = new InMemoryImportRunRepository(() => `fixture-import-run-${++importRunSequence}`)
  const importRepository = new InMemoryWcaImportRepository()
  const loadStaging = createLoadWcaStagingService(importRepository)
  const transformGeneral = createTransformGeneralCanonicalService(importRepository)
  const publishDataset = createPublishDatasetService({ clock, publisher: datasets })

  return createSyncWcaExportService({
    clock,
    datasets,
    exportClient: createFixtureWcaExportClient(fixtureDir),
    importRuns,
    syncCycle: createLocalWcaSyncCycleService({
      clock,
      datasetVersions: datasets,
      importRuns,
      loadStaging,
      publishDataset,
      runMode: 'local-fixture',
      sourceFiles: createStaticWcaSourceFilesService(fixtureWcaExportFiles(fixtureDir)),
      transformGeneral,
    }),
  })
}
