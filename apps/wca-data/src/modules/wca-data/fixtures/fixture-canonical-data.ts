import { createLoadWcaStagingService } from '../application/import/load-wca-staging.service.js'
import { createTransformGeneralCanonicalService } from '../application/import/transform-general-canonical.service.js'
import type { GeneralDataRepository } from '../application/read-models/general-data.repository.js'
import { InMemoryWcaImportRepository } from '../persistence/in-memory-wca-import.repository.js'
import { fixtureDataset } from './fixture-manifest.js'
import { defaultFixtureWcaExportDir, fixtureWcaExportFiles } from './wca-export-fixture.js'

const fixtureImportRunId = 'fixture-import-run-1'

export async function createFixtureCanonicalDataRepository(fixtureDir = defaultFixtureWcaExportDir()): Promise<GeneralDataRepository> {
  const repository = new InMemoryWcaImportRepository()

  await createLoadWcaStagingService(repository).execute({
    files: fixtureWcaExportFiles(fixtureDir),
    importRunId: fixtureImportRunId,
  })
  await createTransformGeneralCanonicalService(repository).execute({
    datasetId: fixtureDataset.id,
    importRunId: fixtureImportRunId,
  })

  return repository
}
