import { PgBoss, type ConstructorOptions } from 'pg-boss'
import type { WcaDataDatabaseEnv } from '../config/env.schema.js'

export function createWcaDataPgBoss(env: WcaDataDatabaseEnv): PgBoss {
  return new PgBoss(pgBossOptions(env))
}

export function pgBossOptions(env: WcaDataDatabaseEnv): ConstructorOptions {
  return {
    application_name: 'rubiks-wca-data-worker',
    connectionString: env.WCA_DATA_DATABASE_URL,
    schema: env.WCA_DATA_PG_BOSS_SCHEMA,
    ssl: env.WCA_DATA_DATABASE_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined,
  }
}
