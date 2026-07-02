import { describe, expect, it } from 'vitest'
import { loadEnv, requireDatabaseEnv } from '../../config/env.js'
import { pgBossOptions } from '../pg-boss.js'

describe('pgBossOptions', () => {
  it('uses the configured database URL and schema', () => {
    const env = requireDatabaseEnv(loadEnv({
      WCA_DATA_DATABASE_URL: 'postgres://localhost/wca',
      WCA_DATA_PG_BOSS_SCHEMA: 'custom_jobs',
    }))

    expect(pgBossOptions(env)).toMatchObject({
      application_name: 'rubiks-wca-data-worker',
      connectionString: 'postgres://localhost/wca',
      schema: 'custom_jobs',
      ssl: undefined,
    })
  })
})
