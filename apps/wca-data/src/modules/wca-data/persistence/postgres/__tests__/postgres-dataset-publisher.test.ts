import { describe, expect, it } from 'vitest'
import { PostgresDatasetPublisher } from '../postgres-dataset-publisher.js'
import type { Queryable } from '../queryable.js'

describe('PostgresDatasetPublisher', () => {
  it('marks the dataset active and retires the previous active dataset in one transaction', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return { rows: [] }
      },
    }

    await new PostgresDatasetPublisher(db).publishDataset({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })

    expect(calls[0]?.sql).toBe('begin')
    expect(calls[1]?.sql).toContain('update wca_dataset_versions')
    expect(calls[1]?.sql).toContain("status = 'retired'")
    expect(calls[1]?.params).toEqual(['dataset-1'])
    expect(calls[2]?.sql).toContain('update wca_dataset_versions')
    expect(calls[2]?.sql).toContain("status = 'active'")
    expect(calls[2]?.params).toEqual(['dataset-1', '2026-06-30T12:00:00.000Z'])
    expect(calls.at(-1)?.sql).toBe('commit')
  })

  it('rolls back when activation fails', async () => {
    const calls: string[] = []
    const db: Queryable = {
      async query(sql) {
        calls.push(sql)

        if (sql.includes('published_at = $2')) {
          throw new Error('activation failed')
        }

        return { rows: [] }
      },
    }

    await expect(new PostgresDatasetPublisher(db).publishDataset({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })).rejects.toThrow('activation failed')
    expect(calls.at(-1)).toBe('rollback')
  })
})
