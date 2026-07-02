import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicScramble, type PublicScramble } from '../support/public-records.presenter.js'
import type { ListScramblesInput, WcaDataListResponse } from '../wca-data-public.types.js'

type ScrambleServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createScrambleService({ data, datasetContext }: ScrambleServiceDeps) {
  return {
    async listScrambles(input: ListScramblesInput = {}): Promise<WcaDataListResponse<PublicScramble>> {
      const { dataset, meta } = await datasetContext.get()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const scrambles = await data.listScrambles(dataset.id, { ...input, page, pageSize })

      return listResponse(scrambles.items.map(publicScramble), { page, pageSize, total: scrambles.total }, meta)
    },
  }
}
