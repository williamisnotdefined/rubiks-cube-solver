import { describe, expect, it } from 'vitest'
import { loadEnv, requireDatabaseEnv } from '../../config/env.js'
import { pgPoolConfig } from '../postgres.js'

describe('pgPoolConfig', () => {
  it('uses the configured database URL and application name', () => {
    const env = requireDatabaseEnv(loadEnv({ WCA_DATA_DATABASE_URL: 'postgres://localhost/wca' }))

    expect(pgPoolConfig(env)).toMatchObject({
      application_name: 'rubiks-wca-data',
      connectionString: 'postgres://localhost/wca',
      ssl: undefined,
    })
  })

  it('enables SSL when required', () => {
    const env = requireDatabaseEnv(loadEnv({
      WCA_DATA_DATABASE_SSL_MODE: 'require',
      WCA_DATA_DATABASE_URL: 'postgres://localhost/wca',
    }))

    expect(pgPoolConfig(env).ssl).toEqual({ rejectUnauthorized: false })
  })
})
