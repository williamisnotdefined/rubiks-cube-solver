import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicRank, type PublicRank } from '../support/public-records.presenter.js'
import type { ListRankingsInput, WcaDataListResponse } from '../wca-data-public.types.js'

type RankingServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createRankingService({ data, datasetContext }: RankingServiceDeps) {
  async function listRankings(input: ListRankingsInput): Promise<WcaDataListResponse<PublicRank>> {
    const { dataset, meta } = await datasetContext.get()
    const region = input.region ?? 'world'
    const page = normalizedPage(input.page)
    const pageSize = normalizedPageSize(input.pageSize)
    const rankings = await data.listRankings(dataset.id, { ...input, page, pageSize, region })

    return listResponse(rankings.items.map((rank) => publicRank(rank, input.type, region)), { page, pageSize, total: rankings.total }, meta)
  }

  return {
    listRankings,

    async listTopSpeedcubers(input: Omit<ListRankingsInput, 'region'>): Promise<WcaDataListResponse<PublicRank>> {
      return listRankings({ ...input, region: 'world' })
    },
  }
}
