import type { GeneralDataRepository } from '../repositories/general-data.repository.js'
import type { DatasetRepository } from '../repositories/wca-data.repositories.js'
import { createActiveDatasetContextService } from './support/dataset-context.js'
import { createCompetitionService } from './use-cases/competition.service.js'
import { createPersonService } from './use-cases/person.service.js'
import { createRankingService } from './use-cases/ranking.service.js'
import { createReferenceDataService } from './use-cases/reference-data.service.js'
import { createResultService } from './use-cases/result.service.js'
import { createScrambleService } from './use-cases/scramble.service.js'

export type WcaDataPublicService = ReturnType<typeof createWcaDataPublicService>

type WcaDataPublicServiceDeps = {
  data: GeneralDataRepository
  datasets: DatasetRepository
}

export function createWcaDataPublicService({ data, datasets }: WcaDataPublicServiceDeps) {
  const datasetContext = createActiveDatasetContextService({ datasets })

  return {
    ...createReferenceDataService({ data, datasetContext }),
    ...createCompetitionService({ data, datasetContext }),
    ...createPersonService({ data, datasetContext }),
    ...createRankingService({ data, datasetContext }),
    ...createResultService({ data, datasetContext }),
    ...createScrambleService({ data, datasetContext }),
  }
}
