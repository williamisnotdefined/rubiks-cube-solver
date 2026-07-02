import { AppError } from '../../../../shared/errors/app-error.js'
import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type { DatasetRepository } from '../../repositories/wca-data.repositories.js'
import type { WcaDataMeta } from '../wca-data-public.types.js'

export type ActiveDatasetContext = {
  dataset: DatasetMetadata
  meta: WcaDataMeta
}

export type ActiveDatasetContextService = {
  get: () => Promise<ActiveDatasetContext>
}

type ActiveDatasetContextServiceDeps = {
  datasets: DatasetRepository
}

export function createActiveDatasetContextService({ datasets }: ActiveDatasetContextServiceDeps): ActiveDatasetContextService {
  return {
    async get(): Promise<ActiveDatasetContext> {
      const dataset = await datasets.getActiveDataset()

      if (dataset === null) {
        throw new AppError('dataset_unavailable', 'No active WCA dataset is available', 503)
      }

      return {
        dataset,
        meta: {
          datasetId: dataset.id,
          exportDate: dataset.exportDate,
          exportVersion: dataset.exportVersion,
          source: 'World Cube Association Results Export',
        },
      }
    },
  }
}
