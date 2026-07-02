export type DatasetVersionStatus = 'active' | 'building' | 'failed' | 'ready' | 'retired' | 'validating'

export type DatasetVersionRecord = {
  documentCount: number
  exportDate: string
  exportFormatVersion: string | null
  exportVersion: string
  id: string
  isActive: boolean
  metadata: Record<string, unknown>
  publishedAt: string | null
  sourceReadme: string | null
  sourceSqlFilesizeBytes: number | null
  sourceSqlUrl: string | null
  sourceTsvFilesizeBytes: number | null
  sourceTsvUrl: string | null
  status: DatasetVersionStatus
  totalBytes: number
}
