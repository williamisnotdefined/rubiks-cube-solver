import { describe, expect, it } from 'vitest'
import { PostgresWorkerHeartbeatRepository } from '../postgres-worker-heartbeat.repository.js'
import type { Queryable } from '../queryable.js'

describe('PostgresWorkerHeartbeatRepository', () => {
  it('records the latest heartbeat for the WCA worker', async () => {
    const calls: Array<{ params?: unknown[]; sql: string }> = []
    const db: Queryable = {
      async query(sql, params) {
        calls.push({ params, sql })
        return { rows: [] }
      },
    }

    await new PostgresWorkerHeartbeatRepository(db).recordHeartbeat(new Date('2026-08-04T04:30:00Z'))

    expect(calls[0]?.sql).toContain('insert into wca_worker_heartbeats')
    expect(calls[0]?.sql).toContain('on conflict (worker_name) do update')
    expect(calls[0]?.params).toEqual(['wca-data-worker', '2026-08-04T04:30:00.000Z'])
  })

  it('reads the latest heartbeat as an ISO timestamp', async () => {
    const db: Queryable = {
      async query() {
        return { rows: [{ heartbeat_at: new Date('2026-08-04T04:30:00Z') }] }
      },
    }

    await expect(new PostgresWorkerHeartbeatRepository(db).getLastHeartbeat())
      .resolves.toBe('2026-08-04T04:30:00.000Z')
  })
})
