import type { WcaDataEnv } from '../../config/env.schema.js'
import { createGetApiStatusService, type GetApiStatusService } from './public-api/get-api-status.service.js'
import { createWcaDataPublicService, type WcaDataPublicService } from './public-api/wca-data-public.service.js'
import type { GeneralDataRepository } from './repositories/general-data.repository.js'
import { createFixtureCanonicalDataRepository } from './fixtures/fixture-canonical-data.js'
import { fixtureDataset } from './fixtures/fixture-manifest.js'
import { InMemoryDatasetRepository } from './persistence/memory/in-memory-dataset.repository.js'
import type {
  DatasetMetricsRepository,
  DatasetRecordCounts,
  DatasetRepository,
  ImportRunHistoryRepository,
} from './repositories/wca-data.repositories.js'

export type WcaDataModule = {
  getApiStatus: GetApiStatusService
  publicApi: WcaDataPublicService
}

export type CreateWcaDataModuleDeps = {
  env: WcaDataEnv
  fixtureRootDir?: string
}

export type CreateWcaDataModuleFromRepositoriesDeps = {
  data: GeneralDataRepository
  datasetMetrics?: DatasetMetricsRepository
  datasets: DatasetRepository
  importRuns?: ImportRunHistoryRepository
  scheduler: {
    cron: string
    enabled: boolean
    timezone: string
  }
}

export async function createWcaDataModule({ env, fixtureRootDir }: CreateWcaDataModuleDeps): Promise<WcaDataModule> {
  const datasets = new InMemoryDatasetRepository(fixtureDataset, { [fixtureDataset.id]: fixtureDatasetCounts })
  const data = await createFixtureCanonicalDataRepository(fixtureRootDir)

  return createWcaDataModuleFromRepositories({
    data,
    datasetMetrics: datasets,
    datasets,
    scheduler: schedulerFromEnv(env),
  })
}

export function createWcaDataModuleFromRepositories({
  data,
  datasetMetrics,
  datasets,
  importRuns,
  scheduler,
}: CreateWcaDataModuleFromRepositoriesDeps): WcaDataModule {
  return {
    getApiStatus: createGetApiStatusService({
      ...(datasetMetrics === undefined ? {} : { datasetMetrics }),
      datasets,
      ...(importRuns === undefined ? {} : { importRuns }),
      scheduler,
    }),
    publicApi: createWcaDataPublicService({ data, datasets }),
  }
}

const fixtureDatasetCounts: DatasetRecordCounts = {
  championships: 1,
  championshipEligibleCountries: 2,
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
  totalRows: 37,
}

export function schedulerFromEnv(env: WcaDataEnv) {
  return {
    cron: env.WCA_DATA_SYNC_CRON,
    enabled: env.WCA_DATA_SYNC_ENABLED,
    timezone: env.WCA_DATA_SYNC_TIMEZONE,
  }
}
