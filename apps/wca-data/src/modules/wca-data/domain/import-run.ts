export type ImportRunReason = 'manual' | 'retry' | 'schedule' | 'test'

export type ImportRunStatus = 'checking' | 'skipped' | 'running' | 'imported' | 'built' | 'validated' | 'published' | 'failed'

export type ImportRunRecord = {
  datasetId: string | null
  errorCode: string | null
  errorMessage: string | null
  finishedAt: string | null
  id: string
  log: Record<string, unknown>
  reason: ImportRunReason
  remoteExportDate: string | null
  remoteExportVersion: string | null
  startedAt: string
  status: ImportRunStatus
}
