import { describe, expect, it } from 'vitest'
import type { GeneralDataRepository } from '../repositories/general-data.repository.js'
import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import { createWcaDataModuleFromRepositories } from '../wca-data.module.js'

describe('createWcaDataModuleFromRepositories', () => {
  it('creates services backed by injected repositories', async () => {
    const dataset: DatasetMetadata = {
      exportDate: '2026-06-30T00:00:16Z',
      exportVersion: 'v2.0.2',
      id: 'dataset-1',
      publishedAt: '2026-06-30T12:00:00Z',
    }
    const data: GeneralDataRepository = {
      getCompetition: async () => null,
      getPerson: async () => null,
      listChampionships: async () => [],
      listCompetitions: async () => [],
      listCompetitionsPage: async () => ({ items: [], total: 0 }),
      listContinents: async () => [],
      listCountries: async () => [],
      listEvents: async () => [{ format: 'time', id: '333', name: '3x3x3 Cube' }],
      listFormats: async () => [],
      listPersons: async () => [],
      listPersonsPage: async () => ({ items: [], total: 0 }),
      listRankings: async () => ({ items: [], total: 0 }),
      listRankDocuments: async () => [],
      listResults: async () => ({ items: [], total: 0 }),
      listResultDocuments: async () => [],
      listRoundTypes: async () => [],
    }
    const module = createWcaDataModuleFromRepositories({
      data,
      datasets: { getActiveDataset: async () => dataset },
      scheduler: { cron: '30 4 * * *', enabled: true, timezone: 'UTC' },
    })

    await expect(module.getApiStatus.execute()).resolves.toMatchObject({ activeDataset: dataset, status: 'ok' })
    await expect(module.publicApi.listEvents()).resolves.toMatchObject({
      data: [{ id: '333', name: '3x3x3 Cube' }],
      meta: { datasetId: 'dataset-1' },
    })
  })
})
