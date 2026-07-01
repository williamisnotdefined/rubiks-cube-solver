import type { Readable } from 'node:stream'
import type { DatasetMetadata } from '../domain/dataset-metadata.js'
import type { DatasetVersionRecord, DatasetVersionStatus } from '../domain/dataset-version.js'
import type { ImportRunReason, ImportRunRecord } from '../domain/import-run.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'

export type DatasetRepository = {
  getActiveDataset: () => Promise<DatasetMetadata | null>
}

export type DatasetRecordCounts = {
  championships: number
  competitions: number
  continents: number
  countries: number
  events: number
  formats: number
  persons: number
  ranksAverage: number
  ranksSingle: number
  resultAttempts: number
  results: number
  roundTypes: number
  scrambles: number
  totalRows: number
}

export type DatasetMetricsRepository = {
  getDatasetCounts: (datasetId: string) => Promise<DatasetRecordCounts | null>
}

export type DatasetStorage = {
  openReadStream: (storageKey: string) => Promise<Readable>
}

export type RecordSkippedImportRunInput = {
  log?: Record<string, unknown>
  now: Date
  reason: ImportRunReason
  remote: WcaExportMetadata
}

export type CreateBuildingDatasetInput = {
  metadata?: Record<string, unknown>
  remote: WcaExportMetadata
}

export type UpdateDatasetStatusInput = {
  datasetId: string
  metadata?: Record<string, unknown>
  status: Extract<DatasetVersionStatus, 'failed' | 'ready' | 'validating'>
}

export type DatasetVersionRepository = {
  createBuilding: (input: CreateBuildingDatasetInput) => Promise<DatasetVersionRecord>
  updateStatus: (input: UpdateDatasetStatusInput) => Promise<DatasetVersionRecord>
}

export type StartImportRunInput = {
  log?: Record<string, unknown>
  now: Date
  reason: ImportRunReason
}

export type UpdateImportRunStatusInput = {
  datasetId?: string
  id: string
  log?: Record<string, unknown>
  now: Date
  remote?: WcaExportMetadata
  status: Exclude<ImportRunRecord['status'], 'checking' | 'failed' | 'skipped'>
}

export type MarkImportRunFailedInput = {
  errorCode: string
  errorMessage: string
  id: string
  log?: Record<string, unknown>
  now: Date
}

export type ImportRunRepository = {
  markFailed: (input: MarkImportRunFailedInput) => Promise<ImportRunRecord>
  recordSkipped: (input: RecordSkippedImportRunInput) => Promise<ImportRunRecord>
  startChecking: (input: StartImportRunInput) => Promise<ImportRunRecord>
  updateStatus: (input: UpdateImportRunStatusInput) => Promise<ImportRunRecord>
}

export type ImportRunHistoryRepository = {
  getLastImportRun: () => Promise<ImportRunRecord | null>
}
