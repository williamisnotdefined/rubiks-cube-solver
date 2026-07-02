import { AppError } from '../../../../shared/errors/app-error.js'
import type { GeneralDataRepository } from '../../repositories/general-data.repository.js'
import type { ActiveDatasetContextService } from '../support/dataset-context.js'
import { listResponse, normalizedPage, normalizedPageSize } from '../support/pagination.js'
import { publicPerson, type PublicPerson } from '../support/public-records.presenter.js'
import type { ListPersonsInput, WcaDataItemResponse, WcaDataListResponse } from '../wca-data-public.types.js'

type PersonServiceDeps = {
  data: GeneralDataRepository
  datasetContext: ActiveDatasetContextService
}

export function createPersonService({ data, datasetContext }: PersonServiceDeps) {
  return {
    async getPerson(id: string): Promise<WcaDataItemResponse<PublicPerson>> {
      const { dataset, meta } = await datasetContext.get()
      const person = await data.getPerson(dataset.id, id)

      if (person === null) {
        throw new AppError('not_found', 'WCA person not found', 404)
      }

      return { data: publicPerson(person), meta }
    },

    async listPersons(input: ListPersonsInput = {}): Promise<WcaDataListResponse<PublicPerson>> {
      const { dataset, meta } = await datasetContext.get()
      const page = normalizedPage(input.page)
      const pageSize = normalizedPageSize(input.pageSize)
      const persons = await data.listPersonsPage(dataset.id, { ...input, page, pageSize })

      return listResponse(persons.items.map(publicPerson), { page, pageSize, total: persons.total }, meta)
    },
  }
}
