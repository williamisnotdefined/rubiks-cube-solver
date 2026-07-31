import { describe, expect, it } from 'vitest'
import { PostgresWcaStagingCleaner } from '../postgres-wca-staging-cleaner.js'
import type { Queryable } from '../queryable.js'

describe('PostgresWcaStagingCleaner', () => {
  it('truncates every allowlisted WCA staging table', async () => {
    const calls: string[] = []
    const db: Queryable = {
      async query(sql) {
        calls.push(sql)
        return { rows: [] }
      },
    }

    await expect(new PostgresWcaStagingCleaner(db).truncate()).resolves.toEqual({ truncatedTableCount: 14 })
    expect(calls[0]).toContain('truncate table wca_staging_championships')
    expect(calls[0]).toContain('wca_staging_result_attempts')
    expect(calls[0]).toContain('wca_staging_scrambles')
  })
})
