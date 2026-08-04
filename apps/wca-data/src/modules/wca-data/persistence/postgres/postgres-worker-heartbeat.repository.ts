import { wcaDataWorkerName } from '../../domain/worker-heartbeat.js'
import type { WorkerHeartbeatRepository } from '../../repositories/wca-data.repositories.js'
import type { Queryable } from './queryable.js'

type WorkerHeartbeatRow = {
  heartbeat_at: Date | string
}

export class PostgresWorkerHeartbeatRepository implements WorkerHeartbeatRepository {
  constructor(private readonly db: Queryable) {}

  async getLastHeartbeat(): Promise<string | null> {
    const result = await this.db.query<WorkerHeartbeatRow>(`
      select heartbeat_at
      from wca_worker_heartbeats
      where worker_name = $1
      limit 1
    `, [wcaDataWorkerName])
    const heartbeatAt = result.rows[0]?.heartbeat_at

    return heartbeatAt === undefined ? null : dateLikeToIso(heartbeatAt)
  }

  async recordHeartbeat(now: Date): Promise<void> {
    await this.db.query(`
      insert into wca_worker_heartbeats (worker_name, heartbeat_at)
      values ($1, $2)
      on conflict (worker_name) do update
      set heartbeat_at = excluded.heartbeat_at
    `, [wcaDataWorkerName, now.toISOString()])
  }
}

function dateLikeToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
