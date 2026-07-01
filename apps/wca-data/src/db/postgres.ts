import { Pool, type PoolConfig } from 'pg'
import type { WcaDataDatabaseEnv } from '../config/env.schema.js'

export function createPgPool(env: WcaDataDatabaseEnv): Pool {
  return new Pool(pgPoolConfig(env))
}

export function pgPoolConfig(env: WcaDataDatabaseEnv): PoolConfig {
  return {
    application_name: 'rubiks-wca-data',
    connectionString: env.WCA_DATA_DATABASE_URL,
    ssl: env.WCA_DATA_DATABASE_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined,
  }
}
