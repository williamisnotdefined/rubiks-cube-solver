import { AppError } from '../../../../shared/errors/app-error.js'
import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicCompetition, type PublicCompetition } from '../support/public-records.presenter.js'
import type { ListCompetitionsInput, WcaDataItemResponse, WcaDataListResponse } from '../wca-data-public.types.js'

type CompetitionServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createCompetitionService({ data, datasetContext }: CompetitionServiceDeps) {
  return {
    async getCompetition(id: string): Promise<WcaDataItemResponse<PublicCompetition>> {
      const { dataset, meta } = await datasetContext.get()
      const competition = await data.getCompetition(dataset.id, id)

      if (competition === null) {
        throw new AppError('not_found', 'WCA competition not found', 404)
      }

      return { data: publicCompetition(competition), meta }
    },

    async listCompetitions(input: ListCompetitionsInput = {}): Promise<WcaDataListResponse<PublicCompetition>> {
      const { dataset, meta } = await datasetContext.get()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const competitions = await data.listCompetitionsPage(dataset.id, { ...input, page, pageSize })

      return listResponse(competitions.items.map(publicCompetition), { page, pageSize, total: competitions.total }, meta)
    },
  }
}
