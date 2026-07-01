import { randomUUID } from 'node:crypto'
import type { ImportRunRecord } from '../../domain/import-run.js'
import type {
  ImportRunHistoryRepository,
  ImportRunRepository,
  MarkImportRunFailedInput,
  RecordSkippedImportRunInput,
  StartImportRunInput,
  UpdateImportRunStatusInput,
} from '../repositories.js'
import type { Queryable } from './queryable.js'

type ImportRunRow = {
  dataset_id: string | null
  error_code: string | null
  error_message: string | null
  finished_at: Date | string | null
  id: string
  log: Record<string, unknown>
  reason: ImportRunRecord['reason']
  remote_export_date: Date | string | null
  remote_export_version: string | null
  started_at: Date | string
  status: ImportRunRecord['status']
}

const IMPORT_RUN_COLUMNS = `
  id,
  dataset_id,
  reason,
  status,
  remote_export_date,
  remote_export_version,
  started_at,
  finished_at,
  error_code,
  error_message,
  log
`

export class PostgresImportRunRepository implements ImportRunRepository, ImportRunHistoryRepository {
  constructor(
    private readonly db: Queryable,
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async startChecking(input: StartImportRunInput): Promise<ImportRunRecord> {
    const result = await this.db.query<ImportRunRow>(`
      insert into wca_import_runs (
        id,
        reason,
        status,
        started_at,
        log
      ) values ($1, $2, 'checking', $3, $4::jsonb)
      returning ${IMPORT_RUN_COLUMNS}
    `, [
      this.idGenerator(),
      input.reason,
      input.now.toISOString(),
      JSON.stringify(input.log ?? {}),
    ])

    return firstImportRun(result.rows, 'Failed to start WCA import run')
  }

  async updateStatus(input: UpdateImportRunStatusInput): Promise<ImportRunRecord> {
    const result = await this.db.query<ImportRunRow>(`
      update wca_import_runs
      set
        status = $2,
        dataset_id = coalesce($3::uuid, dataset_id),
        remote_export_date = coalesce($4::timestamptz, remote_export_date),
        remote_export_version = coalesce($5, remote_export_version),
        log = log || $6::jsonb,
        finished_at = case when $2 = 'published' then $7::timestamptz else finished_at end
      where id = $1
      returning ${IMPORT_RUN_COLUMNS}
    `, [
      input.id,
      input.status,
      input.datasetId ?? null,
      input.remote?.exportDate ?? null,
      input.remote?.exportVersion ?? null,
      JSON.stringify(input.log ?? {}),
      input.now.toISOString(),
    ])

    return firstImportRun(result.rows, `WCA import run not found: ${input.id}`)
  }

  async markFailed(input: MarkImportRunFailedInput): Promise<ImportRunRecord> {
    const result = await this.db.query<ImportRunRow>(`
      update wca_import_runs
      set
        status = 'failed',
        error_code = $2,
        error_message = $3,
        finished_at = $4,
        log = log || $5::jsonb
      where id = $1
      returning ${IMPORT_RUN_COLUMNS}
    `, [
      input.id,
      input.errorCode,
      input.errorMessage,
      input.now.toISOString(),
      JSON.stringify(input.log ?? {}),
    ])

    return firstImportRun(result.rows, `WCA import run not found: ${input.id}`)
  }

  async recordSkipped(input: RecordSkippedImportRunInput): Promise<ImportRunRecord> {
    const id = this.idGenerator()
    const timestamp = input.now.toISOString()
    const result = await this.db.query<ImportRunRow>(`
      insert into wca_import_runs (
        id,
        reason,
        status,
        remote_export_date,
        remote_export_version,
        started_at,
        finished_at,
        log
      ) values ($1, $2, 'skipped', $3, $4, $5, $5, $6::jsonb)
      returning ${IMPORT_RUN_COLUMNS}
    `, [
      id,
      input.reason,
      input.remote.exportDate,
      input.remote.exportVersion,
      timestamp,
      JSON.stringify(input.log ?? {}),
    ])
    return firstImportRun(result.rows, 'Failed to record skipped WCA import run')
  }

  async getLastImportRun(): Promise<ImportRunRecord | null> {
    const result = await this.db.query<ImportRunRow>(`
      select ${IMPORT_RUN_COLUMNS}
      from wca_import_runs
      order by finished_at desc nulls last, started_at desc
      limit 1
    `)

    const row = result.rows[0]
    return row === undefined ? null : mapImportRun(row)
  }
}

function firstImportRun(rows: ImportRunRow[], errorMessage: string): ImportRunRecord {
  const row = rows[0]

  if (row === undefined) {
    throw new Error(errorMessage)
  }

  return mapImportRun(row)
}

function mapImportRun(row: ImportRunRow): ImportRunRecord {
  return {
    datasetId: row.dataset_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    finishedAt: row.finished_at === null ? null : dateLikeToIso(row.finished_at),
    id: row.id,
    log: row.log,
    reason: row.reason,
    remoteExportDate: row.remote_export_date === null ? null : dateLikeToIso(row.remote_export_date),
    remoteExportVersion: row.remote_export_version,
    startedAt: dateLikeToIso(row.started_at),
    status: row.status,
  }
}

function dateLikeToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
