import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import type { DatasetVersionRecord } from '../domain/dataset-version.js'
import type { DatasetPublisher } from '../application/publish/publish-dataset.service.js'
import type {
  CreateBuildingDatasetInput,
  DatasetRepository,
  DatasetVersionRepository,
  UpdateDatasetStatusInput,
} from './repositories.js'

export class InMemoryDatasetVersionRepository implements DatasetRepository, DatasetVersionRepository, DatasetPublisher {
  readonly records: DatasetVersionRecord[] = []

  constructor(private readonly idGenerator: () => string = () => `dataset-${Date.now()}`) {}

  async getActiveDataset(): Promise<DatasetMetadata | null> {
    const active = [...this.records].reverse().find((record) => record.isActive && record.status === 'active')

    if (active === undefined) {
      return null
    }

    return {
      exportDate: active.exportDate,
      exportVersion: active.exportVersion,
      id: active.id,
      publishedAt: active.publishedAt ?? active.exportDate,
    }
  }

  async createBuilding(input: CreateBuildingDatasetInput): Promise<DatasetVersionRecord> {
    const record: DatasetVersionRecord = {
      documentCount: 0,
      exportDate: input.remote.exportDate,
      exportFormatVersion: input.remote.exportFormatVersion,
      exportVersion: input.remote.exportVersion,
      id: this.idGenerator(),
      isActive: false,
      metadata: input.metadata ?? {},
      publishedAt: null,
      sourceReadme: input.remote.readme,
      sourceSqlFilesizeBytes: input.remote.sqlFilesizeBytes,
      sourceSqlUrl: input.remote.sqlUrl,
      sourceTsvFilesizeBytes: input.remote.tsvFilesizeBytes,
      sourceTsvUrl: input.remote.tsvUrl,
      status: 'building',
      totalBytes: 0,
    }

    this.records.push(record)
    return record
  }

  async updateStatus(input: UpdateDatasetStatusInput): Promise<DatasetVersionRecord> {
    const record = this.recordById(input.datasetId)
    record.status = input.status
    record.metadata = { ...record.metadata, ...(input.metadata ?? {}) }
    return record
  }

  async publishDataset(input: {
    datasetId: string
    publishedAt: Date
  }): Promise<void> {
    for (const record of this.records) {
      if (record.isActive && record.id !== input.datasetId) {
        record.isActive = false
        record.status = 'retired'
      }
    }

    const record = this.recordById(input.datasetId)
    record.isActive = true
    record.publishedAt = input.publishedAt.toISOString()
    record.status = 'active'
  }

  private recordById(id: string): DatasetVersionRecord {
    const record = this.records.find((candidate) => candidate.id === id)

    if (record === undefined) {
      throw new Error(`Dataset version not found: ${id}`)
    }

    return record
  }
}
