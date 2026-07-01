import { describe, expect, it } from 'vitest'
import { loadEnv, requireDatabaseEnv } from '../env.js'

describe('loadEnv', () => {
  it('loads defaults for local development', () => {
    expect(loadEnv({})).toMatchObject({
      WCA_DATA_HOST: '127.0.0.1',
      WCA_DATA_NODE_ENV: 'development',
      WCA_DATA_PORT: 8796,
      WCA_DATA_PUBLIC_BASE_URL: 'http://speedcube.com.br/api',
      WCA_DATA_SYNC_CRON: '30 4 * * *',
      WCA_DATA_SYNC_ENABLED: true,
      WCA_DATA_SYNC_TIMEZONE: 'UTC',
      WCA_DATA_WCA_EXPORT_METADATA_URL: 'https://www.worldcubeassociation.org/api/v0/export/public',
    })
  })

  it('rejects invalid ports', () => {
    expect(() => loadEnv({ WCA_DATA_PORT: '70000' })).toThrow()
  })

  it('parses boolean env values explicitly', () => {
    expect(loadEnv({ WCA_DATA_SYNC_ENABLED: 'false' }).WCA_DATA_SYNC_ENABLED).toBe(false)
    expect(loadEnv({ WCA_DATA_SYNC_ENABLED: '0' }).WCA_DATA_SYNC_ENABLED).toBe(false)
    expect(loadEnv({ WCA_DATA_SYNC_ENABLED: 'true' }).WCA_DATA_SYNC_ENABLED).toBe(true)
    expect(loadEnv({ WCA_DATA_SYNC_ENABLED: '1' }).WCA_DATA_SYNC_ENABLED).toBe(true)
    expect(() => loadEnv({ WCA_DATA_SYNC_ENABLED: 'maybe' })).toThrow()
  })

  it('requires database URL for database operations', () => {
    expect(() => requireDatabaseEnv(loadEnv({}))).toThrow('WCA_DATA_DATABASE_URL is required')

    expect(requireDatabaseEnv(loadEnv({ WCA_DATA_DATABASE_URL: 'postgres://localhost/wca' })).WCA_DATA_DATABASE_URL).toBe(
      'postgres://localhost/wca',
    )
  })

  it('rejects invalid pg-boss schema names', () => {
    expect(() => loadEnv({ WCA_DATA_PG_BOSS_SCHEMA: 'wca-jobs' })).toThrow()
  })
})
