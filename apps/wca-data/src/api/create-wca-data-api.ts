import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { WcaDataDatabaseEnv, WcaDataEnv } from '../config/env.schema.js'
import { requireDatabaseEnv } from '../config/env.js'
import { createPgPool } from '../db/postgres.js'
import { createWcaDataModule, createWcaDataModuleFromRepositories, schedulerFromEnv, type WcaDataModule } from '../modules/wca-data/wca-data.module.js'
import { PostgresDatasetRepository } from '../modules/wca-data/persistence/postgres/postgres-dataset.repository.js'
import { PostgresGeneralDataRepository } from '../modules/wca-data/persistence/postgres/postgres-general-data.repository.js'
import { PostgresImportRunRepository } from '../modules/wca-data/persistence/postgres/postgres-import-run.repository.js'
import type { Queryable } from '../modules/wca-data/persistence/postgres/queryable.js'
import { registerErrorHandlerPlugin } from './plugins/error-handler.plugin.js'
import { registerHealthRoutes } from './routes/health.routes.js'
import { registerOpenApiRoutes } from './routes/openapi.routes.js'
import { registerWcaDataRoutes } from './routes/wca-data.routes.js'

export type WcaDataApiDatabase = Queryable & {
  end: () => Promise<void>
}

export type CreateWcaDataApiDeps = {
  env: WcaDataEnv
  pgPoolFactory?: (env: WcaDataDatabaseEnv) => WcaDataApiDatabase
  wcaData?: WcaDataModule
}

export async function createWcaDataApi({ env, pgPoolFactory = createPgPool, wcaData }: CreateWcaDataApiDeps) {
  const app = Fastify({
    logger: env.WCA_DATA_NODE_ENV === 'test' ? false : { level: env.WCA_DATA_LOG_LEVEL },
    trustProxy: true,
  })

  await registerErrorHandlerPlugin(app)
  await app.register(cors, { origin: true })

  const module = wcaData ?? await createDefaultWcaDataModule({ env, pgPoolFactory, onDatabaseClose: (database) => {
    app.addHook('onClose', async () => {
      await database.end()
    })
  } })

  await app.register(registerHealthRoutes, { prefix: '/health' })
  await app.register(registerWcaDataRoutes, { prefix: '/api/wca-data/v1', wcaData: module })
  await app.register(registerOpenApiRoutes, { prefix: '/api/wca-data/v1', publicBaseUrl: env.WCA_DATA_PUBLIC_BASE_URL })

  return app
}

type CreateDefaultWcaDataModuleDeps = {
  env: WcaDataEnv
  onDatabaseClose: (database: WcaDataApiDatabase) => void
  pgPoolFactory: (env: WcaDataDatabaseEnv) => WcaDataApiDatabase
}

async function createDefaultWcaDataModule({
  env,
  onDatabaseClose,
  pgPoolFactory,
}: CreateDefaultWcaDataModuleDeps): Promise<WcaDataModule> {
  if (env.WCA_DATA_DATABASE_URL === undefined) {
    if (env.WCA_DATA_NODE_ENV === 'production') {
      throw new Error('WCA_DATA_DATABASE_URL is required for WCA Data API production runtime.')
    }

    return createWcaDataModule({ env })
  }

  const database = pgPoolFactory(requireDatabaseEnv(env))
  onDatabaseClose(database)
  const datasets = new PostgresDatasetRepository(database)

  return createWcaDataModuleFromRepositories({
    data: new PostgresGeneralDataRepository(database),
    datasetMetrics: datasets,
    datasets,
    importRuns: new PostgresImportRunRepository(database),
    scheduler: schedulerFromEnv(env),
  })
}
