import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicResult, type PublicResult } from '../support/public-records.presenter.js'
import type { ListResultsInput, WcaDataListResponse } from '../wca-data-public.types.js'

type ResultServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createResultService({ data, datasetContext }: ResultServiceDeps) {
  return {
    async listResults(input: ListResultsInput = {}): Promise<WcaDataListResponse<PublicResult>> {
      const { dataset, meta } = await datasetContext.get()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const results = await data.listResults(dataset.id, { ...input, page, pageSize })

      return listResponse(results.items.map(publicResult), { page, pageSize, total: results.total }, meta)
    },
  }
}
