import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type { DatasetVersionRecord } from '../../domain/dataset-version.js'
import type { DatasetPublisher } from '../../publish/publish-dataset.service.js'
import type {
  CreateBuildingDatasetInput,
  DatasetRepository,
  DatasetVersionRepository,
  UpdateDatasetStatusInput,
} from '../../repositories/wca-data.repositories.js'

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

  async purgeInactiveDatasets(): Promise<string[]> {
    const deletedDatasetIds = this.records
      .filter((record) => !record.isActive && (record.status === 'failed' || record.status === 'retired'))
      .map((record) => record.id)
    const retainedRecords = this.records.filter((record) => !deletedDatasetIds.includes(record.id))

    this.records.splice(0, this.records.length, ...retainedRecords)
    return deletedDatasetIds
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
    const record = this.recordById(input.datasetId)

    if (record.status !== 'ready') {
      throw new Error(`WCA dataset version is not ready: ${input.datasetId}`)
    }

    for (const record of this.records) {
      if (record.isActive && record.id !== input.datasetId) {
        record.isActive = false
        record.status = 'retired'
      }
    }

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
