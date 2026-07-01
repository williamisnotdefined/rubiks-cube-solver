import { z } from 'zod'

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

const portSchema = z.coerce.number().int().min(1).max(65535)
const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }

  switch (value.trim().toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'on':
      return true
    case 'false':
    case '0':
    case 'no':
    case 'off':
      return false
    default:
      return value
  }
}, z.boolean())

export const wcaDataEnvSchema = z.object({
  WCA_DATA_DATABASE_SSL_MODE: z.enum(['disable', 'require']).default('disable'),
  WCA_DATA_DATABASE_URL: z.string().min(1).optional(),
  WCA_DATA_HOST: z.string().min(1).default('127.0.0.1'),
  WCA_DATA_LOG_LEVEL: z.enum(logLevels).default('info'),
  WCA_DATA_NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WCA_DATA_PG_BOSS_SCHEMA: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).default('wca_jobs'),
  WCA_DATA_PORT: portSchema.default(8796),
  WCA_DATA_PUBLIC_BASE_URL: z.string().url().default('http://speedcube.com.br/api'),
  WCA_DATA_STORAGE_DIR: z.string().min(1).default('storage/wca-data'),
  WCA_DATA_SYNC_CRON: z.string().min(1).default('30 4 * * *'),
  WCA_DATA_SYNC_ENABLED: booleanEnvSchema.default(true),
  WCA_DATA_SYNC_TIMEZONE: z.string().min(1).default('UTC'),
  WCA_DATA_WCA_EXPORT_METADATA_URL: z.string().url().default('https://www.worldcubeassociation.org/api/v0/export/public'),
})

export type WcaDataEnv = z.infer<typeof wcaDataEnvSchema>

export type WcaDataDatabaseEnv = WcaDataEnv & {
  WCA_DATA_DATABASE_URL: string
}
