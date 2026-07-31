import type { WcaImportExecutionLock } from '../../import/import-execution-lock.js'
import type { CopyQueryPool } from './postgres-copy-staging-loader.js'

export type PostgresImportLockPool = CopyQueryPool

type LockRow = {
  acquired: boolean
}

const importLockNamespace = 20_260_731
const importLockKey = 1

export class PostgresWcaImportExecutionLock implements WcaImportExecutionLock {
  constructor(private readonly pool: PostgresImportLockPool) {}

  async executeExclusive<T>(operation: () => Promise<T>): Promise<T | null> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        'select pg_try_advisory_lock($1::integer, $2::integer) as acquired',
        [importLockNamespace, importLockKey],
      ) as { rows: LockRow[] }

      if (result.rows[0]?.acquired !== true) {
        return null
      }

      try {
        return await operation()
      } finally {
        await client.query('select pg_advisory_unlock($1::integer, $2::integer)', [importLockNamespace, importLockKey])
      }
    } finally {
      client.release()
    }
  }
}
