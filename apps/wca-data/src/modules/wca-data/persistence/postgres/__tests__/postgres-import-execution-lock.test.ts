import { describe, expect, it, vi } from 'vitest'
import { PostgresWcaImportExecutionLock } from '../postgres-import-execution-lock.js'

describe('PostgresWcaImportExecutionLock', () => {
  it('does not execute when another import holds the lock', async () => {
    const operation = vi.fn(async () => 'published')
    const pool = fakePool(false)

    await expect(new PostgresWcaImportExecutionLock(pool).executeExclusive(operation)).resolves.toBeNull()
    expect(operation).not.toHaveBeenCalled()
    expect(pool.released).toBe(1)
  })

  it('releases the lock and connection when the import fails', async () => {
    const pool = fakePool(true)

    await expect(new PostgresWcaImportExecutionLock(pool).executeExclusive(async () => {
      throw new Error('import failed')
    })).rejects.toThrow('import failed')

    expect(pool.queries).toEqual([
      'select pg_try_advisory_lock($1::integer, $2::integer) as acquired',
      'select pg_advisory_unlock($1::integer, $2::integer)',
    ])
    expect(pool.released).toBe(1)
  })
})

function fakePool(acquired: boolean) {
  const queries: string[] = []
  let released = 0

  return {
    get queries() {
      return queries
    },
    get released() {
      return released
    },
    async connect() {
      return {
        async query(query: string) {
          queries.push(query)
          return { rows: query.includes('pg_try_advisory_lock') ? [{ acquired }] : [] }
        },
        release() {
          released += 1
        },
      }
    },
  }
}
