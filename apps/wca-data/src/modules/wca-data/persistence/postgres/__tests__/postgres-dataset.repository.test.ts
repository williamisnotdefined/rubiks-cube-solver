import { describe, expect, it } from 'vitest'
import { PostgresDatasetRepository } from '../postgres-dataset.repository.js'
import type { Queryable } from '../queryable.js'

describe('PostgresDatasetRepository', () => {
  it('maps the active dataset row', async () => {
    const db: Queryable = {
      async query() {
        return {
          rows: [{
            export_date: new Date('2026-06-30T00:00:16Z'),
            export_version: 'v2.0.2',
            id: '11111111-1111-4111-8111-111111111111',
            published_at: new Date('2026-06-30T04:58:00Z'),
          }],
        }
      },
    }

    await expect(new PostgresDatasetRepository(db).getActiveDataset()).resolves.toEqual({
      exportDate: '2026-06-30T00:00:16.000Z',
      exportVersion: 'v2.0.2',
      id: '11111111-1111-4111-8111-111111111111',
      publishedAt: '2026-06-30T04:58:00.000Z',
    })
  })

  it('returns null when no active dataset exists', async () => {
    const db: Queryable = { async query() { return { rows: [] } } }

    await expect(new PostgresDatasetRepository(db).getActiveDataset()).resolves.toBeNull()
  })

  it('creates a building dataset version from export metadata', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            document_count: 0,
            export_date: new Date('2026-06-30T00:00:16Z'),
            export_format_version: 'v2.0.2',
            export_version: 'v2.0.2',
            id: '33333333-3333-4333-8333-333333333333',
            is_active: false,
            metadata: { requestedBy: 'test' },
            published_at: null,
            source_readme: 'Readme text',
            source_sql_filesize_bytes: null,
            source_sql_url: null,
            source_tsv_filesize_bytes: '100',
            source_tsv_url: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
            status: 'building',
            total_bytes: '0',
          }],
        }
      },
    }

    const result = await new PostgresDatasetRepository(
      db,
      () => '33333333-3333-4333-8333-333333333333',
    ).createBuilding({
      metadata: { requestedBy: 'test' },
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

    expect(calls[0]?.params).toEqual(['2026-06-30T00:00:16Z'])
    expect(calls[0]?.sql).toContain('delete from wca_dataset_versions')
    expect(calls[0]?.sql).toContain("status = 'failed'")
    expect(calls[1]?.params).toEqual([
      '33333333-3333-4333-8333-333333333333',
      '2026-06-30T00:00:16Z',
      'v2.0.2',
      'v2.0.2',
      'https://www.worldcubeassociation.org/export/results/v2/tsv',
      100,
      null,
      null,
      'Readme text',
      JSON.stringify({ requestedBy: 'test' }),
    ])
    expect(result).toEqual({
      documentCount: 0,
      exportDate: '2026-06-30T00:00:16.000Z',
      exportFormatVersion: 'v2.0.2',
      exportVersion: 'v2.0.2',
      id: '33333333-3333-4333-8333-333333333333',
      isActive: false,
      metadata: { requestedBy: 'test' },
      publishedAt: null,
      sourceReadme: 'Readme text',
      sourceSqlFilesizeBytes: null,
      sourceSqlUrl: null,
      sourceTsvFilesizeBytes: 100,
      sourceTsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
      status: 'building',
      totalBytes: 0,
    })
  })

  it('reads dataset counts from transform metadata', async () => {
    const db: Queryable = {
      async query() {
        return {
          rows: [{
            metadata: {
              transform: {
                championships: 1,
                championshipEligibleCountries: 2,
                competitions: 3,
                continents: 2,
                countries: 2,
                events: 2,
                formats: 1,
                persons: 4,
                ranksAverage: 1,
                ranksSingle: 1,
                resultAttempts: 13,
                results: 3,
                roundTypes: 1,
                scrambles: 1,
              },
            },
          }],
        }
      },
    }

    await expect(new PostgresDatasetRepository(db).getDatasetCounts('dataset-1')).resolves.toEqual({
      championships: 1,
      championshipEligibleCountries: 2,
      competitions: 3,
      continents: 2,
      countries: 2,
      events: 2,
      formats: 1,
      persons: 4,
      ranksAverage: 1,
      ranksSingle: 1,
      resultAttempts: 13,
      results: 3,
      roundTypes: 1,
      scrambles: 1,
      totalRows: 37,
    })
  })

  it('updates dataset version status and metadata', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return {
          rows: [{
            document_count: 3,
            export_date: '2026-06-30T00:00:16.000Z',
            export_format_version: 'v2.0.2',
            export_version: 'v2.0.2',
            id: '33333333-3333-4333-8333-333333333333',
            is_active: false,
            metadata: { documentCount: 3 },
            published_at: null,
            source_readme: 'Readme text',
            source_sql_filesize_bytes: null,
            source_sql_url: null,
            source_tsv_filesize_bytes: 100,
            source_tsv_url: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
            status: 'validating',
            total_bytes: 1200,
          }],
        }
      },
    }

    const result = await new PostgresDatasetRepository(db).updateStatus({
      datasetId: '33333333-3333-4333-8333-333333333333',
      metadata: { documentCount: 3 },
      status: 'validating',
    })

    expect(calls[0]?.params).toEqual([
      '33333333-3333-4333-8333-333333333333',
      'validating',
      JSON.stringify({ documentCount: 3 }),
    ])
    expect(result.status).toBe('validating')
    expect(result.totalBytes).toBe(1200)
  })
})
