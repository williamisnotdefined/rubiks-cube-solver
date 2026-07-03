import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicWorldRecord, type PublicWorldRecord } from '../support/public-records.presenter.js'
import type { ListWorldRecordsInput, WcaDataListResponse } from '../wca-data-public.types.js'

type RecordServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createRecordService({ data, datasetContext }: RecordServiceDeps) {
  return {
    async listWorldRecords(input: ListWorldRecordsInput): Promise<WcaDataListResponse<PublicWorldRecord>> {
      const { dataset, meta } = await datasetContext.get()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const records = await data.listWorldRecords(dataset.id, { ...input, page, pageSize })

      return listResponse(records.items.map(publicWorldRecord), { page, pageSize, total: records.total }, meta)
    },
  }
}
