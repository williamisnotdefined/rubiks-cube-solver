import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type { DatasetMetricsRepository, DatasetRecordCounts, DatasetRepository } from '../../repositories/wca-data.repositories.js'

export class InMemoryDatasetRepository implements DatasetRepository, DatasetMetricsRepository {
  constructor(
    private readonly activeDataset: DatasetMetadata | null,
    private readonly countsByDatasetId: Readonly<Record<string, DatasetRecordCounts>> = {},
  ) {}

  async getActiveDataset(): Promise<DatasetMetadata | null> {
    return this.activeDataset
  }

  async getDatasetCounts(datasetId: string): Promise<DatasetRecordCounts | null> {
    return this.countsByDatasetId[datasetId] ?? null
  }
}
