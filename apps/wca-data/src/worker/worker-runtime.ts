import type { WcaDataDatabaseEnv } from '../config/env.schema.js'
import { createPgPool } from '../db/postgres.js'
import { createWcaExportClient, type WcaExportClient } from '../infra/http/wca-export-client.js'
import {
  createPostgresSyncWcaExportService,
  type CreatePostgresSyncWcaExportServiceInput,
} from '../modules/wca-data/postgres-sync-service.js'
import type { CopyQueryPool } from '../modules/wca-data/persistence/postgres/postgres-copy-staging-loader.js'
import type { Queryable } from '../modules/wca-data/persistence/postgres/queryable.js'
import { createWcaDataPgBoss } from './pg-boss.js'
import { startWcaDataWorker, type WcaDataBoss, type WcaDataWorker, type WorkerLogger } from './sync-worker.js'

export type WcaDataWorkerDatabase = Queryable & CopyQueryPool & {
  end: () => Promise<void>
}

export type StartWcaDataWorkerRuntimeDeps = {
  env: WcaDataDatabaseEnv
  exportClientFactory?: (metadataUrl: string) => WcaExportClient
  logger?: WorkerLogger
  pgBossFactory?: (env: WcaDataDatabaseEnv) => WcaDataBoss
  pgPoolFactory?: (env: WcaDataDatabaseEnv) => WcaDataWorkerDatabase
  syncWcaExportFactory?: (input: CreatePostgresSyncWcaExportServiceInput) => ReturnType<typeof createPostgresSyncWcaExportService>
}

export async function startWcaDataWorkerRuntime({
  env,
  exportClientFactory = (metadataUrl) => createWcaExportClient({ metadataUrl }),
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
    storageRootDir: env.WCA_DATA_STORAGE_DIR,
  })

  try {
    const worker = await startWcaDataWorker({
      boss,
      ...(logger === undefined ? {} : { logger }),
      syncCron: env.WCA_DATA_SYNC_CRON,
      syncEnabled: env.WCA_DATA_SYNC_ENABLED,
      syncTimezone: env.WCA_DATA_SYNC_TIMEZONE,
      syncWcaExport,
    })

    return {
      stop: async () => {
        try {
          await worker.stop()
        } finally {
          await database.end()
        }
      },
      workId: worker.workId,
    }
  } catch (error) {
    await database.end()
    throw error
  }
}

function defaultPgBossFactory(env: WcaDataDatabaseEnv): WcaDataBoss {
  return createWcaDataPgBoss(env) as unknown as WcaDataBoss
}

function defaultPgPoolFactory(env: WcaDataDatabaseEnv): WcaDataWorkerDatabase {
  return createPgPool(env) as WcaDataWorkerDatabase
}
