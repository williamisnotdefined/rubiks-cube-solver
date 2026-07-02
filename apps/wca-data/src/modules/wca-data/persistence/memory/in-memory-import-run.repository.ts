import type { ImportRunRecord } from '../../domain/import-run.js'
import type {
  ImportRunHistoryRepository,
  ImportRunRepository,
  MarkImportRunFailedInput,
  RecordSkippedImportRunInput,
  StartImportRunInput,
  UpdateImportRunStatusInput,
} from '../../repositories/wca-data.repositories.js'

export class InMemoryImportRunRepository implements ImportRunRepository, ImportRunHistoryRepository {
  readonly records: ImportRunRecord[] = []

  constructor(private readonly idGenerator: () => string = () => `import-run-${Date.now()}`) {}

  async startChecking(input: StartImportRunInput): Promise<ImportRunRecord> {
    const timestamp = input.now.toISOString()
    const record: ImportRunRecord = {
      datasetId: null,
      errorCode: null,
      errorMessage: null,
      finishedAt: null,
      id: this.idGenerator(),
      log: input.log ?? {},
      reason: input.reason,
      remoteExportDate: null,
      remoteExportVersion: null,
      startedAt: timestamp,
      status: 'checking',
    }

    this.records.push(record)
    return record
  }

  async updateStatus(input: UpdateImportRunStatusInput): Promise<ImportRunRecord> {
    const record = this.recordById(input.id)
    record.datasetId = input.datasetId ?? record.datasetId
    record.status = input.status
    record.log = { ...record.log, ...(input.log ?? {}) }
    record.remoteExportDate = input.remote?.exportDate ?? record.remoteExportDate
    record.remoteExportVersion = input.remote?.exportVersion ?? record.remoteExportVersion

    if (['published'].includes(input.status)) {
      record.finishedAt = input.now.toISOString()
    }

    return record
  }

  async markFailed(input: MarkImportRunFailedInput): Promise<ImportRunRecord> {
    const record = this.recordById(input.id)
    record.errorCode = input.errorCode
    record.errorMessage = input.errorMessage
    record.finishedAt = input.now.toISOString()
    record.log = { ...record.log, ...(input.log ?? {}) }
    record.status = 'failed'

    return record
  }

  async recordSkipped(input: RecordSkippedImportRunInput): Promise<ImportRunRecord> {
    const timestamp = input.now.toISOString()
    const record: ImportRunRecord = {
      datasetId: null,
      errorCode: null,
      errorMessage: null,
      finishedAt: timestamp,
      id: this.idGenerator(),
      log: input.log ?? {},
      reason: input.reason,
      remoteExportDate: input.remote.exportDate,
      remoteExportVersion: input.remote.exportVersion,
      startedAt: timestamp,
      status: 'skipped',
    }

    this.records.push(record)
    return record
  }

  async getLastImportRun(): Promise<ImportRunRecord | null> {
    return this.records.at(-1) ?? null
  }

  private recordById(id: string): ImportRunRecord {
    const record = this.records.find((candidate) => candidate.id === id)

    if (record === undefined) {
      throw new Error(`Import run not found: ${id}`)
    }

    return record
  }
}
