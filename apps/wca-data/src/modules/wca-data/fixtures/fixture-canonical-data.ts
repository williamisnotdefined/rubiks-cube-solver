import { createLoadWcaStagingService } from '../import/load-wca-staging.service.js'
import { createTransformGeneralCanonicalService } from '../import/transform-general-canonical.service.js'
import { InMemoryWcaImportRepository } from '../persistence/memory/in-memory-wca-import.repository.js'
import type { GeneralDataRepository } from '../repositories/general-data.repository.js'
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
