import { describe, expect, it } from 'vitest'
import { PostgresImportRunRepository } from '../postgres-import-run.repository.js'
import type { Queryable } from '../queryable.js'

describe('PostgresImportRunRepository', () => {
  it('starts a checking import run', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            dataset_id: null,
            error_code: null,
            error_message: null,
            finished_at: null,
            id: '22222222-2222-4222-8222-222222222222',
            log: { trigger: 'test' },
            reason: 'test',
            remote_export_date: null,
            remote_export_version: null,
            started_at: new Date('2026-06-30T12:00:00Z'),
            status: 'checking',
          }],
        }
      },
    }

    const result = await new PostgresImportRunRepository(db, () => '22222222-2222-4222-8222-222222222222')
      .startChecking({
        log: { trigger: 'test' },
        now: new Date('2026-06-30T12:00:00Z'),
        reason: 'test',
      })

    expect(calls[0]?.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'test',
      '2026-06-30T12:00:00.000Z',
      JSON.stringify({ trigger: 'test' }),
    ])
    expect(result).toMatchObject({
      finishedAt: null,
      log: { trigger: 'test' },
      reason: 'test',
      status: 'checking',
    })
  })

  it('inserts and maps a skipped import run', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            dataset_id: null,
            error_code: null,
            error_message: null,
            finished_at: new Date('2026-06-30T12:00:00Z'),
            id: '22222222-2222-4222-8222-222222222222',
            log: { activeDatasetId: 'dataset-1' },
            reason: 'manual',
            remote_export_date: new Date('2026-06-30T00:00:16Z'),
            remote_export_version: 'v2.0.2',
            started_at: new Date('2026-06-30T12:00:00Z'),
            status: 'skipped',
          }],
        }
      },
    }

    const result = await new PostgresImportRunRepository(db, () => '22222222-2222-4222-8222-222222222222').recordSkipped({
      log: { activeDatasetId: 'dataset-1' },
      now: new Date('2026-06-30T12:00:00Z'),
      reason: 'manual',
      remote: {
        exportDate: '2026-06-30T00:00:16Z',
        exportFormatVersion: 'v2.0.2',
        exportVersion: 'v2.0.2',
        readme: 'Readme text',
        sqlFilesizeBytes: null,
        sqlUrl: null,
        tsvFilesizeBytes: 100,
        tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
      },
    })

    expect(calls[0]?.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'manual',
      '2026-06-30T00:00:16Z',
      'v2.0.2',
      '2026-06-30T12:00:00.000Z',
      JSON.stringify({ activeDatasetId: 'dataset-1' }),
    ])
    expect(result).toMatchObject({
      finishedAt: '2026-06-30T12:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
      log: { activeDatasetId: 'dataset-1' },
      remoteExportDate: '2026-06-30T00:00:16.000Z',
      status: 'skipped',
    })
  })

  it('updates an import run status with dataset and remote metadata', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            dataset_id: '33333333-3333-4333-8333-333333333333',
            error_code: null,
            error_message: null,
            finished_at: null,
            id: '22222222-2222-4222-8222-222222222222',
            log: { datasetId: '33333333-3333-4333-8333-333333333333' },
            reason: 'manual',
            remote_export_date: new Date('2026-06-30T00:00:16Z'),
            remote_export_version: 'v2.0.2',
            started_at: new Date('2026-06-30T12:00:00Z'),
            status: 'running',
          }],
        }
      },
    }

    const result = await new PostgresImportRunRepository(db).updateStatus({
      datasetId: '33333333-3333-4333-8333-333333333333',
      id: '22222222-2222-4222-8222-222222222222',
      log: { datasetId: '33333333-3333-4333-8333-333333333333' },
      now: new Date('2026-06-30T12:01:00Z'),
      remote: {
        exportDate: '2026-06-30T00:00:16Z',
        exportFormatVersion: 'v2.0.2',
        exportVersion: 'v2.0.2',
        readme: 'Readme text',
        sqlFilesizeBytes: null,
        sqlUrl: null,
        tsvFilesizeBytes: 100,
        tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
      },
      status: 'running',
    })

    expect(calls[0]?.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'running',
      '33333333-3333-4333-8333-333333333333',
      '2026-06-30T00:00:16Z',
      'v2.0.2',
      JSON.stringify({ datasetId: '33333333-3333-4333-8333-333333333333' }),
      '2026-06-30T12:01:00.000Z',
    ])
    expect(result).toMatchObject({
      datasetId: '33333333-3333-4333-8333-333333333333',
      remoteExportDate: '2026-06-30T00:00:16.000Z',
      remoteExportVersion: 'v2.0.2',
      status: 'running',
    })
  })

  it('marks an import run as failed with error details', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            dataset_id: '33333333-3333-4333-8333-333333333333',
            error_code: 'download_failed',
            error_message: 'Download failed',
            finished_at: new Date('2026-06-30T12:05:00Z'),
            id: '22222222-2222-4222-8222-222222222222',
            log: { stage: 'download' },
            reason: 'manual',
            remote_export_date: new Date('2026-06-30T00:00:16Z'),
            remote_export_version: 'v2.0.2',
            started_at: new Date('2026-06-30T12:00:00Z'),
            status: 'failed',
          }],
        }
      },
    }

    const result = await new PostgresImportRunRepository(db).markFailed({
      errorCode: 'download_failed',
      errorMessage: 'Download failed',
      id: '22222222-2222-4222-8222-222222222222',
      log: { stage: 'download' },
      now: new Date('2026-06-30T12:05:00Z'),
    })

    expect(calls[0]?.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'download_failed',
      'Download failed',
      '2026-06-30T12:05:00.000Z',
      JSON.stringify({ stage: 'download' }),
    ])
    expect(result).toMatchObject({
      errorCode: 'download_failed',
      errorMessage: 'Download failed',
      finishedAt: '2026-06-30T12:05:00.000Z',
      status: 'failed',
    })
  })

  it('returns the latest import run', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            dataset_id: '33333333-3333-4333-8333-333333333333',
            error_code: null,
            error_message: null,
            finished_at: new Date('2026-06-30T12:05:00Z'),
            id: '22222222-2222-4222-8222-222222222222',
            log: { documentCount: 4 },
            reason: 'manual',
            remote_export_date: new Date('2026-06-30T00:00:16Z'),
            remote_export_version: 'v2.0.2',
            started_at: new Date('2026-06-30T12:00:00Z'),
            status: 'published',
          }],
        }
      },
    }

    const result = await new PostgresImportRunRepository(db).getLastImportRun()

    expect(calls[0]?.sql).toContain('from wca_import_runs')
    expect(calls[0]?.sql).toContain('order by finished_at desc nulls last, started_at desc')
    expect(result).toMatchObject({
      datasetId: '33333333-3333-4333-8333-333333333333',
      finishedAt: '2026-06-30T12:05:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
      status: 'published',
    })
  })

  it('returns null when no import run exists', async () => {
    const db: Queryable = { async query() { return { rows: [] } } }

    await expect(new PostgresImportRunRepository(db).getLastImportRun()).resolves.toBeNull()
  })
})
