import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPostgresSyncWcaExportService } from '../postgres-sync-service.js'
import type { WcaStagingLoader } from '../application/import/load-wca-staging.service.js'
import type { WcaSourceFilesService } from '../application/import/wca-source-files.service.js'
import type { Queryable } from '../persistence/postgres/queryable.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('createPostgresSyncWcaExportService', () => {
  it('wires Postgres repositories through the import/transform/publish cycle', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-postgres-sync-'))
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db = fakeDb(calls)
    const sourceFiles: WcaSourceFilesService = {
      execute: vi.fn(async ({ importRunId }) => ({
        files: [{ fileName: 'WCA_export_Continents.tsv', localPath: `/tmp/${importRunId}/WCA_export_Continents.tsv` }],
        log: { source: 'fake-source' },
      })),
    }
    const stagingLoader: WcaStagingLoader = {
      loadFile: vi.fn(async ({ definition }) => ({
        fileName: definition.fileName,
        rowCount: 1,
        stagingTable: definition.stagingTable,
      })),
    }
    const service = createPostgresSyncWcaExportService({
      clock: { now: () => new Date('2026-06-30T12:00:00Z') },
      db,
      exportClient: { getPublicExportMetadata: async () => remoteMetadata() },
      sourceFiles,
      stagingLoader,
      storageRootDir: tempDir,
    })

    const result = await service.execute({ force: true, reason: 'manual' })

    expect(result).toMatchObject({
      dataset: {
        exportDate: '2026-06-30T00:00:16.000Z',
        exportVersion: 'v2.0.2',
        publishedAt: '2026-06-30T12:00:00.000Z',
      },
      importRun: {
        finishedAt: '2026-06-30T12:00:00.000Z',
        status: 'published',
      },
      publish: { publishedAt: '2026-06-30T12:00:00.000Z' },
      staging: { totalRows: 1 },
      status: 'published',
      transform: { championships: 0, championshipEligibleCountries: 2, competitions: 1, continents: 2, countries: 2, events: 2, formats: 1, persons: 1, ranksAverage: 1, ranksSingle: 1, resultAttempts: 3, results: 1, roundTypes: 1, scrambles: 1 },
    })
    expect(result.dataset.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.importRun.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.importRun.datasetId).toBe(result.dataset.id)
    expect(sourceFiles.execute).toHaveBeenCalledWith({ importRunId: result.importRun.id, remote: remoteMetadata() })
    expect(stagingLoader.loadFile).toHaveBeenCalledTimes(1)
    expect(calls.some((call) => normalized(call.sql).includes('insert into wca_dataset_versions'))).toBe(true)
    expect(calls.some((call) => normalized(call.sql).includes("status = 'active'"))).toBe(true)
  })
})

function fakeDb(calls: Array<{ params?: unknown[]; sql: string }>): Queryable {
  const state = {
    datasetId: 'dataset-1',
    importRunId: 'run-1',
    remoteExportDate: null as Date | string | null,
    remoteExportVersion: null as string | null,
  }

  return {
    async query(sql, params) {
      calls.push({ params, sql })
      const query = normalized(sql)

      if (query.includes('from wca_dataset_versions') && query.includes('where is_active = true')) {
        return { rows: [] }
      }

      if (query.includes('insert into wca_import_runs')) {
        state.importRunId = String(params?.[0] ?? state.importRunId)
        return { rows: [importRunRow({ id: state.importRunId, reason: String(params?.[1] ?? 'manual'), status: 'checking' })] }
      }

      if (query.includes('insert into wca_dataset_versions')) {
        state.datasetId = String(params?.[0] ?? state.datasetId)
        return { rows: [datasetRow({ id: state.datasetId, status: 'building' })] }
      }

      if (query.includes('update wca_import_runs')) {
        state.remoteExportDate = (params?.[3] as Date | string | null | undefined) ?? state.remoteExportDate
        state.remoteExportVersion = (params?.[4] as string | null | undefined) ?? state.remoteExportVersion

        return {
          rows: [importRunRow({
            datasetId: (params?.[2] as string | null | undefined) ?? state.datasetId,
            finishedAt: params?.[1] === 'published' ? new Date('2026-06-30T12:00:00Z') : null,
            id: state.importRunId,
            log: jsonParam(params?.[5]),
            remoteExportDate: state.remoteExportDate,
            remoteExportVersion: state.remoteExportVersion,
            status: String(params?.[1] ?? 'running'),
          })],
        }
      }

      if (query.includes('update wca_dataset_versions') && query.includes('returning')) {
        return { rows: [datasetRow({ id: state.datasetId, status: String(params?.[1] ?? 'validating') })] }
      }

      if (query.includes('insert into wca_competitions')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_championships')) {
        return { rows: [{ count: 0 }] }
      }

      if (query.includes('insert into wca_championship_eligible_countries')) {
        return { rows: [{ count: 2 }] }
      }

      if (query.includes('insert into wca_scrambles')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_continents')) {
        return { rows: [{ count: 2 }] }
      }

      if (query.includes('insert into wca_countries')) {
        return { rows: [{ count: 2 }] }
      }

      if (query.includes('insert into wca_events')) {
        return { rows: [{ count: 2 }] }
      }

      if (query.includes('insert into wca_round_types')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_formats')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_persons')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_results')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_result_attempts')) {
        return { rows: [{ count: 3 }] }
      }

      if (query.includes('insert into wca_ranks_single')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('insert into wca_ranks_average')) {
        return { rows: [{ count: 1 }] }
      }

      if (query.includes('from wca_championships')) {
        return { rows: [] }
      }

      if (query.includes('from wca_competitions')) {
        return {
          rows: [{
            cancelled: false,
            cell_name: 'Fixture Open',
            city: 'Warsaw',
            country_id: 'PL',
            day: 30,
            end_day: 30,
            end_month: 6,
            event_specs: '333 clock',
            external_website: '',
            id: 'FixtureOpen2026',
            information: 'Fixture competition',
            latitude: '52123456',
            longitude: '21012345',
            month: 6,
            name: 'Fixture Open 2026',
            organisers: 'Fixture Organiser',
            venue: 'Fixture Venue',
            venue_address: 'Fixture Address',
            venue_details: 'Fixture Details',
            wca_delegates: 'Fixture Delegate',
            year: 2026,
          }],
        }
      }

      if (query.includes('from wca_continents')) {
        return { rows: [{ id: 'europe', name: 'Europe' }, { id: 'north-america', name: 'North America' }] }
      }

      if (query.includes('from wca_countries')) {
        return { rows: [{ iso2_code: 'PL', name: 'Poland' }, { iso2_code: 'US', name: 'United States' }] }
      }

      if (query.includes('from wca_events')) {
        return { rows: [{ format: 'time', id: '333', name: '3x3x3 Cube' }, { format: 'time', id: 'clock', name: 'Clock' }] }
      }

      if (query.includes('from wca_formats')) {
        return {
          rows: [{
            expected_solve_count: 5,
            id: 'a',
            name: 'Average of 5',
            short_name: 'Ao5',
            sort_by: 'average',
            sort_by_second: 'best',
            trim_fastest_n: 1,
            trim_slowest_n: 1,
          }],
        }
      }

      if (query.includes('from wca_persons')) {
        return { rows: [{ country_id: 'PL', gender: 'o', id: '2026FIXT01', name: 'Fixture Solver', sub_id: 1 }] }
      }

      if (query.includes('from wca_ranks_single')) {
        return {
          rows: [{
            best: 1000,
            continent_rank: 1,
            country_rank: 1,
            event_id: '333',
            person_id: '2026FIXT01',
            rank_type: 'single',
            world_rank: 1,
          }, {
            best: 1200,
            continent_rank: 1,
            country_rank: 1,
            event_id: '333',
            person_id: '2026FIXT01',
            rank_type: 'average',
            world_rank: 1,
          }],
        }
      }

      if (query.includes('from wca_results')) {
        return {
          rows: [{
            average: 1200,
            best: 1000,
            competition_id: 'FixtureOpen2026',
            event_id: '333',
            format_name: 'Average of 5',
            person_id: '2026FIXT01',
            pos: 1,
            round_name: 'Final',
            solves: [1000, 1200, 1400],
          }],
        }
      }

      if (query.includes('from wca_round_types')) {
        return { rows: [{ cell_name: 'Final', id: 'f', is_final: true, name: 'Final' }] }
      }

      return { rows: [] }
    },
  }
}

function datasetRow(input: { id: string; status: string }) {
  return {
    document_count: 0,
    export_date: new Date('2026-06-30T00:00:16Z'),
    export_format_version: 'v2.0.2',
    export_version: 'v2.0.2',
    id: input.id,
    is_active: input.status === 'active',
    metadata: {},
    published_at: null,
    source_readme: 'Readme text',
    source_sql_filesize_bytes: null,
    source_sql_url: null,
    source_tsv_filesize_bytes: 100,
    source_tsv_url: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
    status: input.status,
    total_bytes: 0,
  }
}

function importRunRow(input: {
  datasetId?: string | null
  finishedAt?: Date | string | null
  id: string
  log?: Record<string, unknown>
  reason?: string
  remoteExportDate?: Date | string | null
  remoteExportVersion?: string | null
  status: string
}) {
  return {
    dataset_id: input.datasetId ?? null,
    error_code: null,
    error_message: null,
    finished_at: input.finishedAt ?? null,
    id: input.id,
    log: input.log ?? {},
    reason: input.reason ?? 'manual',
    remote_export_date: input.remoteExportDate ?? null,
    remote_export_version: input.remoteExportVersion ?? null,
    started_at: new Date('2026-06-30T12:00:00Z'),
    status: input.status,
  }
}

function jsonParam(value: unknown): Record<string, unknown> {
  return typeof value === 'string' ? JSON.parse(value) : {}
}

function normalized(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase()
}

function remoteMetadata() {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: null,
    sqlUrl: null,
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
