import { resolve } from 'node:path'
import { loadEnv, requireDatabaseEnv } from '../config/env.js'
import { createPgPool } from './postgres.js'
import { discoverMigrationFiles } from './migrations/discover-migrations.js'
import { runMigrations } from './migrations/migration-runner.js'

const migrationsDir = resolve(process.cwd(), 'migrations')
const env = requireDatabaseEnv(loadEnv())
const pool = createPgPool(env)

try {
  const migrations = await discoverMigrationFiles(migrationsDir)
  const result = await runMigrations(pool, migrations)

  console.log(`WCA Data migrations applied: ${result.applied.length}; skipped: ${result.skipped.length}`)
} finally {
  await pool.end()
}
