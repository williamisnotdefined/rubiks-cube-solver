import { wcaDataEnvSchema, type WcaDataDatabaseEnv, type WcaDataEnv } from './env.schema.js'

export function loadEnv(input: NodeJS.ProcessEnv = process.env): WcaDataEnv {
  return wcaDataEnvSchema.parse(input)
}

export function requireDatabaseEnv(env: WcaDataEnv): WcaDataDatabaseEnv {
  if (env.WCA_DATA_DATABASE_URL === undefined) {
    throw new Error('WCA_DATA_DATABASE_URL is required for WCA Data database operations.')
  }

  return env as WcaDataDatabaseEnv
}
