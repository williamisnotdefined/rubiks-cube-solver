import type { WcaDataDatabaseEnv } from '../config/env.schema.js'
import { createPgPool } from '../db/postgres.js'
import { createWcaExportClient, type WcaExportClient } from '../infra/http/wca-export-client.js'
import type { Clock } from '../shared/time/clock.js'
import { systemClock } from '../shared/time/system-clock.js'
import {
  createPostgresSyncWcaExportService,
  type CreatePostgresSyncWcaExportServiceInput,
} from '../modules/wca-data/postgres-sync-service.js'
import type { CopyQueryPool } from '../modules/wca-data/persistence/postgres/postgres-copy-staging-loader.js'
import type { Queryable } from '../modules/wca-data/persistence/postgres/queryable.js'
import { createWcaDataPgBoss } from './pg-boss.js'
import { startWcaDataWorker, type WcaDataBoss, type WcaDataWorker, type WorkerLogger } from './sync-worker.js'
import { PostgresWcaImportExecutionLock } from '../modules/wca-data/persistence/postgres/postgres-import-execution-lock.js'
import type { TransactionalQueryPool } from '../modules/wca-data/persistence/postgres/postgres-dataset-publisher.js'
import { PostgresWorkerHeartbeatRepository } from '../modules/wca-data/persistence/postgres/postgres-worker-heartbeat.repository.js'
import {
  startWcaDataWorkerHeartbeat,
  type StartWcaDataWorkerHeartbeatInput,
  type WcaDataWorkerHeartbeat,
} from './worker-heartbeat.js'

export type WcaDataWorkerDatabase = Queryable & CopyQueryPool & {
  end: () => Promise<void>
}

export type StartWcaDataWorkerRuntimeDeps = {
  clock?: Clock
  env: WcaDataDatabaseEnv
  exportClientFactory?: (metadataUrl: string) => WcaExportClient
  heartbeatFactory?: (input: StartWcaDataWorkerHeartbeatInput) => Promise<WcaDataWorkerHeartbeat>
  logger?: WorkerLogger
  pgBossFactory?: (env: WcaDataDatabaseEnv) => WcaDataBoss
  pgPoolFactory?: (env: WcaDataDatabaseEnv) => WcaDataWorkerDatabase
  syncWcaExportFactory?: (input: CreatePostgresSyncWcaExportServiceInput) => ReturnType<typeof createPostgresSyncWcaExportService>
}

export async function startWcaDataWorkerRuntime({
  clock = systemClock,
  env,
  exportClientFactory = (metadataUrl) => createWcaExportClient({ metadataUrl }),
  heartbeatFactory = startWcaDataWorkerHeartbeat,
  logger,
  pgBossFactory = defaultPgBossFactory,
  pgPoolFactory = defaultPgPoolFactory,
  syncWcaExportFactory = createPostgresSyncWcaExportService,
}: StartWcaDataWorkerRuntimeDeps): Promise<WcaDataWorker> {
  const boss = pgBossFactory(env)
  const database = pgPoolFactory(env)
  const exportClient = exportClientFactory(env.WCA_DATA_WCA_EXPORT_METADATA_URL)
  const syncWcaExport = syncWcaExportFactory({
    copyPool: database,
    db: database,
    exportClient,
    importLock: new PostgresWcaImportExecutionLock(database),
    storageRootDir: env.WCA_DATA_STORAGE_DIR,
    transactionPool: database as unknown as TransactionalQueryPool,
  })

  let heartbeat: WcaDataWorkerHeartbeat | undefined
  let worker: WcaDataWorker | undefined

  try {
    worker = await startWcaDataWorker({
      boss,
      ...(logger === undefined ? {} : { logger }),
      syncCron: env.WCA_DATA_SYNC_CRON,
      syncEnabled: env.WCA_DATA_SYNC_ENABLED,
      syncJobExpireSeconds: env.WCA_DATA_SYNC_JOB_EXPIRE_SECONDS,
      syncTimezone: env.WCA_DATA_SYNC_TIMEZONE,
      syncWcaExport,
    })
    heartbeat = await heartbeatFactory({
      clock,
      heartbeats: new PostgresWorkerHeartbeatRepository(database),
      ...(logger === undefined ? {} : { logger }),
    })

    return {
      stop: async () => {
        heartbeat?.stop()
        try {
          await worker?.stop()
        } finally {
          await database.end()
        }
      },
      workId: worker.workId,
    }
  } catch (error) {
    heartbeat?.stop()
    try {
      await worker?.stop()
    } finally {
      await database.end()
    }
    throw error
  }
}

function defaultPgBossFactory(env: WcaDataDatabaseEnv): WcaDataBoss {
  return createWcaDataPgBoss(env) as unknown as WcaDataBoss
}

function defaultPgPoolFactory(env: WcaDataDatabaseEnv): WcaDataWorkerDatabase {
  return createPgPool(env) as WcaDataWorkerDatabase
}
