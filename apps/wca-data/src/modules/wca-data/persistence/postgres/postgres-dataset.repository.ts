import { randomUUID } from 'node:crypto'
import type { DatasetMetadata } from '../../domain/dataset-metadata.js'
import type { DatasetVersionRecord, DatasetVersionStatus } from '../../domain/dataset-version.js'
import type {
  CreateBuildingDatasetInput,
  DatasetMetricsRepository,
  DatasetRepository,
  DatasetRecordCounts,
  DatasetVersionRepository,
  UpdateDatasetStatusInput,
} from '../../repositories/wca-data.repositories.js'
import type { Queryable } from './queryable.js'

type ActiveDatasetRow = {
  export_date: Date | string
  export_version: string
  id: string
  published_at: Date | string | null
}

type DatasetVersionRow = {
  document_count: number | string
  export_date: Date | string
  export_format_version: string | null
  export_version: string
  id: string
  is_active: boolean
  metadata: Record<string, unknown>
  published_at: Date | string | null
  source_readme: string | null
  source_sql_filesize_bytes: number | string | null
  source_sql_url: string | null
  source_tsv_filesize_bytes: number | string | null
  source_tsv_url: string | null
  status: DatasetVersionStatus
  total_bytes: number | string
}

type DatasetMetadataRow = {
  metadata: Record<string, unknown>
}

const DATASET_VERSION_COLUMNS = `
  id,
  export_date,
  export_version,
  export_format_version,
  source_tsv_url,
  source_tsv_filesize_bytes,
  source_sql_url,
  source_sql_filesize_bytes,
  source_readme,
  status,
  is_active,
  document_count,
  total_bytes,
  published_at,
  metadata
`

export class PostgresDatasetRepository implements DatasetRepository, DatasetVersionRepository, DatasetMetricsRepository {
  constructor(
    private readonly db: Queryable,
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async getActiveDataset(): Promise<DatasetMetadata | null> {
    const result = await this.db.query<ActiveDatasetRow>(`
      select id, export_date, export_version, published_at
      from wca_dataset_versions
      where is_active = true and status = 'active'
      order by published_at desc nulls last, created_at desc
      limit 1
    `)
    const row = result.rows[0]

    if (row === undefined) {
      return null
    }

    return {
      exportDate: dateLikeToIso(row.export_date),
      exportVersion: row.export_version,
      id: row.id,
      publishedAt: row.published_at === null ? dateLikeToIso(row.export_date) : dateLikeToIso(row.published_at),
    }
  }

  async createBuilding(input: CreateBuildingDatasetInput): Promise<DatasetVersionRecord> {
    await this.db.query(`
      delete from wca_dataset_versions
      where export_date = $1::timestamptz
        and is_active = false
        and status = 'failed'
    `, [input.remote.exportDate])

    const result = await this.db.query<DatasetVersionRow>(`
      insert into wca_dataset_versions (
        id,
        export_date,
        export_version,
        export_format_version,
        source_tsv_url,
        source_tsv_filesize_bytes,
        source_sql_url,
        source_sql_filesize_bytes,
        source_readme,
        status,
        metadata
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'building', $10::jsonb)
      returning ${DATASET_VERSION_COLUMNS}
    `, [
      this.idGenerator(),
      input.remote.exportDate,
      input.remote.exportVersion,
      input.remote.exportFormatVersion,
      input.remote.tsvUrl,
      input.remote.tsvFilesizeBytes,
      input.remote.sqlUrl,
      input.remote.sqlFilesizeBytes,
      input.remote.readme,
      JSON.stringify(input.metadata ?? {}),
    ])

    return firstDatasetVersion(result.rows, 'Failed to create WCA dataset version')
  }

  async updateStatus(input: UpdateDatasetStatusInput): Promise<DatasetVersionRecord> {
    const result = await this.db.query<DatasetVersionRow>(`
      update wca_dataset_versions
      set
        status = $2,
        metadata = metadata || $3::jsonb
      where id = $1
      returning ${DATASET_VERSION_COLUMNS}
    `, [
      input.datasetId,
      input.status,
      JSON.stringify(input.metadata ?? {}),
    ])

    return firstDatasetVersion(result.rows, `WCA dataset version not found: ${input.datasetId}`)
  }

  async getDatasetCounts(datasetId: string): Promise<DatasetRecordCounts | null> {
    const result = await this.db.query<DatasetMetadataRow>(`
      select metadata
      from wca_dataset_versions
      where id = $1
      limit 1
    `, [datasetId])

    return datasetRecordCounts(result.rows[0]?.metadata)
  }
}

function datasetRecordCounts(metadata: Record<string, unknown> | undefined): DatasetRecordCounts | null {
  const transform = metadata?.transform

  if (typeof transform !== 'object' || transform === null) {
    return null
  }

  const counts = {
    championships: recordCount(transform, 'championships'),
    championshipEligibleCountries: recordCount(transform, 'championshipEligibleCountries') ?? 0,
    competitions: recordCount(transform, 'competitions'),
    continents: recordCount(transform, 'continents'),
    countries: recordCount(transform, 'countries'),
    events: recordCount(transform, 'events'),
    formats: recordCount(transform, 'formats'),
    persons: recordCount(transform, 'persons'),
    ranksAverage: recordCount(transform, 'ranksAverage'),
    ranksSingle: recordCount(transform, 'ranksSingle'),
    resultAttempts: recordCount(transform, 'resultAttempts'),
    results: recordCount(transform, 'results'),
    roundTypes: recordCount(transform, 'roundTypes'),
    scrambles: recordCount(transform, 'scrambles') ?? 0,
  }

  if (Object.values(counts).some((value) => value === null)) {
    return null
  }

  const typedCounts = counts as Omit<DatasetRecordCounts, 'totalRows'>

  return {
    ...typedCounts,
    totalRows: Object.values(typedCounts).reduce((total, value) => total + value, 0),
  }
}

function recordCount(value: object, key: keyof Omit<DatasetRecordCounts, 'totalRows'>): number | null {
  if (!(key in value)) {
    return null
  }

  const rawValue = (value as Record<string, unknown>)[key]

  if (typeof rawValue === 'number') {
    return Number.isInteger(rawValue) && rawValue >= 0 ? rawValue : null
  }

  if (typeof rawValue === 'string') {
    const parsed = Number(rawValue)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }

  return null
}

function firstDatasetVersion(rows: DatasetVersionRow[], errorMessage: string): DatasetVersionRecord {
  const row = rows[0]

  if (row === undefined) {
    throw new Error(errorMessage)
  }

  return mapDatasetVersion(row)
}

function mapDatasetVersion(row: DatasetVersionRow): DatasetVersionRecord {
  return {
    documentCount: numberLikeToNumber(row.document_count),
    exportDate: dateLikeToIso(row.export_date),
    exportFormatVersion: row.export_format_version,
    exportVersion: row.export_version,
    id: row.id,
    isActive: row.is_active,
    metadata: row.metadata,
    publishedAt: row.published_at === null ? null : dateLikeToIso(row.published_at),
    sourceReadme: row.source_readme,
    sourceSqlFilesizeBytes: nullableNumberLikeToNumber(row.source_sql_filesize_bytes),
    sourceSqlUrl: row.source_sql_url,
    sourceTsvFilesizeBytes: nullableNumberLikeToNumber(row.source_tsv_filesize_bytes),
    sourceTsvUrl: row.source_tsv_url,
    status: row.status,
    totalBytes: numberLikeToNumber(row.total_bytes),
  }
}

function dateLikeToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function nullableNumberLikeToNumber(value: number | string | null): number | null {
  return value === null ? null : numberLikeToNumber(value)
}

function numberLikeToNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}
