import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import type { WcaDataDatabaseEnv, WcaDataEnv } from '../config/env.schema.js'
import { requireDatabaseEnv } from '../config/env.js'
import { createPgPool } from '../db/postgres.js'
import { createWcaDataModule, createWcaDataModuleFromRepositories, schedulerFromEnv, type WcaDataModule } from '../modules/wca-data/wca-data.module.js'
import { PostgresDatasetRepository } from '../modules/wca-data/persistence/postgres/postgres-dataset.repository.js'
import { PostgresGeneralDataRepository } from '../modules/wca-data/persistence/postgres/postgres-general-data.repository.js'
import { PostgresImportRunRepository } from '../modules/wca-data/persistence/postgres/postgres-import-run.repository.js'
import type { Queryable } from '../modules/wca-data/persistence/postgres/queryable.js'
import { WcaDataExceptionFilter } from './filters/wca-data-exception.filter.js'
import { WcaDataApiModule } from './wca-data-api.module.js'

export type WcaDataApiDatabase = Queryable & {
  end: () => Promise<void>
}

export type CreateWcaDataApiDeps = {
  env: WcaDataEnv
  pgPoolFactory?: (env: WcaDataDatabaseEnv) => WcaDataApiDatabase
  wcaData?: WcaDataModule
}

export async function createWcaDataApi({ env, pgPoolFactory = createPgPool, wcaData }: CreateWcaDataApiDeps): Promise<NestFastifyApplication> {
  const registration: WcaDataModuleRegistration = wcaData === undefined
    ? await createDefaultWcaDataModule({ env, pgPoolFactory })
    : { wcaData }
  const apiModule = registration.close === undefined
    ? WcaDataApiModule.register({ env, wcaData: registration.wcaData })
    : WcaDataApiModule.register({ close: registration.close, env, wcaData: registration.wcaData })
  const adapter = new FastifyAdapter({
    logger: env.WCA_DATA_NODE_ENV === 'test' ? false : { level: env.WCA_DATA_LOG_LEVEL },
    trustProxy: true,
  })
  const app = await NestFactory.create<NestFastifyApplication>(
    apiModule,
    adapter,
    env.WCA_DATA_NODE_ENV === 'test' ? { logger: false } : {},
  )

  app.enableCors({ origin: true })
  app.enableShutdownHooks()
  app.useGlobalFilters(new WcaDataExceptionFilter())

  await app.init()
  await app.getHttpAdapter().getInstance().ready()

  return app
}

type WcaDataModuleRegistration = {
  close?: () => Promise<void>
  wcaData: WcaDataModule
}

type CreateDefaultWcaDataModuleDeps = {
  env: WcaDataEnv
  pgPoolFactory: (env: WcaDataDatabaseEnv) => WcaDataApiDatabase
}

async function createDefaultWcaDataModule({
  env,
  pgPoolFactory,
}: CreateDefaultWcaDataModuleDeps): Promise<WcaDataModuleRegistration> {
  if (env.WCA_DATA_DATABASE_URL === undefined) {
    if (env.WCA_DATA_NODE_ENV === 'production') {
      throw new Error('WCA_DATA_DATABASE_URL is required for WCA Data API production runtime.')
    }

    return { wcaData: await createWcaDataModule({ env }) }
  }

  const database = pgPoolFactory(requireDatabaseEnv(env))
  const datasets = new PostgresDatasetRepository(database)

  return {
    close: () => database.end(),
    wcaData: createWcaDataModuleFromRepositories({
      data: new PostgresGeneralDataRepository(database),
      datasetMetrics: datasets,
      datasets,
      importRuns: new PostgresImportRunRepository(database),
      scheduler: schedulerFromEnv(env),
    }),
  }
}
