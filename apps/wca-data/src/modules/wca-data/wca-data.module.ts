import type { WcaDataEnv } from '../../config/env.schema.js'
import { createGetApiStatusService, type GetApiStatusService } from './application/public-api/get-api-status.service.js'
import { createWcaDataApiService, type WcaDataApiService } from './application/public-api/wca-data-api.service.js'
import type { GeneralDataRepository } from './application/read-models/general-data.repository.js'
import { createFixtureCanonicalDataRepository } from './fixtures/fixture-canonical-data.js'
import { fixtureDataset } from './fixtures/fixture-manifest.js'
import { InMemoryDatasetRepository } from './persistence/in-memory-dataset.repository.js'
import type {
  DatasetMetricsRepository,
  DatasetRecordCounts,
  DatasetRepository,
  ImportRunHistoryRepository,
} from './persistence/repositories.js'

export type WcaDataModule = {
  getApiStatus: GetApiStatusService
  wcaDataApi: WcaDataApiService
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
    wcaDataApi: createWcaDataApiService({ data, datasets }),
  }
}

const fixtureDatasetCounts: DatasetRecordCounts = {
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

export function schedulerFromEnv(env: WcaDataEnv) {
  return {
    cron: env.WCA_DATA_SYNC_CRON,
    enabled: env.WCA_DATA_SYNC_ENABLED,
    timezone: env.WCA_DATA_SYNC_TIMEZONE,
  }
}
