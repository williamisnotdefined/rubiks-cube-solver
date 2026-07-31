import { describe, expect, it } from 'vitest'
import { PostgresDatasetPublisher } from '../postgres-dataset-publisher.js'
import type { Queryable } from '../queryable.js'

describe('PostgresDatasetPublisher', () => {
  it('marks the dataset active and retires the previous active dataset in one transaction', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    let releases = 0
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })

        if (sql.includes('for update') || sql.includes('returning id')) {
          return { rows: [{ id: 'dataset-1' }] }
        }

        return { rows: [] }
      },
    }

    await new PostgresDatasetPublisher({
      connect: async () => ({
        ...db,
        release: () => {
          releases += 1
        },
      }),
    }).publishDataset({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })

    expect(calls[0]?.sql).toBe('begin')
    expect(calls[1]?.sql).toContain('for update')
    expect(calls[1]?.params).toEqual(['dataset-1'])
    expect(calls[2]?.sql).toContain("status = 'retired'")
    expect(calls[2]?.params).toEqual(['dataset-1'])
    expect(calls[3]?.sql).toContain("status = 'active'")
    expect(calls[3]?.params).toEqual(['dataset-1', '2026-06-30T12:00:00.000Z'])
    expect(calls.at(-1)?.sql).toBe('commit')
    expect(releases).toBe(1)
  })

  it('rolls back when activation fails', async () => {
    const calls: string[] = []
    const db: Queryable = {
      async query(sql) {
        calls.push(sql)

        if (sql.includes('for update')) {
          return { rows: [{ id: 'dataset-1' }] }
        }

        if (sql.includes('published_at = $2')) {
          throw new Error('activation failed')
        }

        return { rows: [] }
      },
    }

    await expect(new PostgresDatasetPublisher({
      connect: async () => ({ ...db, release: () => undefined }),
    }).publishDataset({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })).rejects.toThrow('activation failed')
    expect(calls.at(-1)).toBe('rollback')
  })

  it('does not retire the active dataset when the candidate is not ready', async () => {
    const calls: string[] = []
    const db: Queryable = {
      async query(sql) {
        calls.push(sql)
        return { rows: [] }
      },
    }

    await expect(new PostgresDatasetPublisher({
      connect: async () => ({ ...db, release: () => undefined }),
    }).publishDataset({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })).rejects.toThrow('WCA dataset version is not ready')
    expect(calls).not.toContain(expect.stringContaining("status = 'retired'"))
    expect(calls.at(-1)).toBe('rollback')
  })
})
