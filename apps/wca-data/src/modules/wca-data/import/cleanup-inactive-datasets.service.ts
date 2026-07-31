import type { DatasetVersionRepository } from '../repositories/wca-data.repositories.js'

export type CleanupInactiveDatasetsResult = {
  deletedDatasetIds: string[]
}

export type CleanupInactiveDatasetsService = {
  execute: () => Promise<CleanupInactiveDatasetsResult>
}

export function createCleanupInactiveDatasetsService({
  datasetVersions,
}: {
  datasetVersions: DatasetVersionRepository
}): CleanupInactiveDatasetsService {
  return {
    async execute(): Promise<CleanupInactiveDatasetsResult> {
      return { deletedDatasetIds: await datasetVersions.purgeInactiveDatasets() }
    },
  }
}
