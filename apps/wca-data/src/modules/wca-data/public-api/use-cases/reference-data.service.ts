import type {
  WcaContinentRecord,
  WcaCountryRecord,
  WcaEventRecord,
  WcaFormatRecord,
} from '../../domain/wca-records.js'
import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { pageResponse } from '../support/pagination.js'
import {
  publicChampionship,
  publicChampionshipEligibleCountry,
  publicRoundType,
  type PublicChampionship,
  type PublicChampionshipEligibleCountry,
  type PublicRoundType,
} from '../support/public-records.presenter.js'
import type {
  ListChampionshipEligibleCountriesInput,
  ListChampionshipsInput,
  WcaDataListInput,
  WcaDataListResponse,
} from '../wca-data-public.types.js'

type ReferenceDataServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createReferenceDataService({ data, datasetContext }: ReferenceDataServiceDeps) {
  return {
    async listChampionshipEligibleCountries(
      input: ListChampionshipEligibleCountriesInput = {},
    ): Promise<WcaDataListResponse<PublicChampionshipEligibleCountry>> {
      const { dataset, meta } = await datasetContext.get()
      const items = (await data.listChampionshipEligibleCountries(dataset.id, input)).map(publicChampionshipEligibleCountry)

      return pageResponse(items, input, meta)
    },

    async listChampionships(input: ListChampionshipsInput = {}): Promise<WcaDataListResponse<PublicChampionship>> {
      const { dataset, meta } = await datasetContext.get()
      const championships = (await data.listChampionships(dataset.id))
        .filter((championship) => input.championshipType === undefined || championship.championshipType === input.championshipType)
        .filter((championship) => input.competitionId === undefined || championship.competitionId === input.competitionId)
        .map(publicChampionship)

      return pageResponse(championships, input, meta)
    },

    async listContinents(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaContinentRecord>> {
      const { dataset, meta } = await datasetContext.get()
      return pageResponse(await data.listContinents(dataset.id), input, meta)
    },

    async listCountries(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaCountryRecord>> {
      const { dataset, meta } = await datasetContext.get()
      return pageResponse(await data.listCountries(dataset.id), input, meta)
    },

    async listEvents(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaEventRecord>> {
      const { dataset, meta } = await datasetContext.get()
      return pageResponse(await data.listEvents(dataset.id), input, meta)
    },

    async listFormats(input: WcaDataListInput = {}): Promise<WcaDataListResponse<WcaFormatRecord>> {
      const { dataset, meta } = await datasetContext.get()
      return pageResponse(await data.listFormats(dataset.id), input, meta)
    },

    async listRoundTypes(input: WcaDataListInput = {}): Promise<WcaDataListResponse<PublicRoundType>> {
      const { dataset, meta } = await datasetContext.get()
      return pageResponse((await data.listRoundTypes(dataset.id)).map(publicRoundType), input, meta)
    },
  }
}
