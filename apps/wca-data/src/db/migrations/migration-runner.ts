import type { MigrationFile } from './discover-migrations.js'

const migrationLockId = 87262141

export type AppliedMigrationRow = {
  checksum_sha256: string
  version: string
}

export type MigrationClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: AppliedMigrationRow[] }>
  release: () => void
}

export type MigrationPool = {
  connect: () => Promise<MigrationClient>
}

export type MigrationRunResult = {
  applied: string[]
  skipped: string[]
}

export function planMigrations(migrations: MigrationFile[], appliedRows: AppliedMigrationRow[]): MigrationRunResult {
  const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]))
  const result: MigrationRunResult = { applied: [], skipped: [] }

  for (const migration of migrations) {
    const applied = appliedByVersion.get(migration.version)

    if (applied === undefined) {
      result.applied.push(migration.version)
      continue
    }

    if (applied.checksum_sha256 !== migration.checksumSha256) {
      throw new Error(`Migration checksum mismatch for version ${migration.version}`)
    }

    result.skipped.push(migration.version)
  }

  return result
}

export async function runMigrations(pool: MigrationPool, migrations: MigrationFile[]): Promise<MigrationRunResult> {
  const client = await pool.connect()

  try {
    await client.query('select pg_advisory_lock($1)', [migrationLockId])
    await ensureMigrationTable(client)

    const appliedRows = await listAppliedMigrations(client)
    const plan = planMigrations(migrations, appliedRows)

    for (const version of plan.applied) {
      const migration = migrations.find((candidate) => candidate.version === version)

      if (migration === undefined) {
        throw new Error(`Migration plan references unknown version ${version}`)
      }

      await applyMigration(client, migration)
    }

    return plan
  } finally {
    await client.query('select pg_advisory_unlock($1)', [migrationLockId])
    client.release()
  }
}

async function ensureMigrationTable(client: MigrationClient): Promise<void> {
  await client.query(`
    create table if not exists wca_schema_migrations (
      version text primary key,
      name text not null,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now()
    )
  `)
}

async function listAppliedMigrations(client: MigrationClient): Promise<AppliedMigrationRow[]> {
  const result = await client.query('select version, checksum_sha256 from wca_schema_migrations order by version asc')

  return result.rows
}

async function applyMigration(client: MigrationClient, migration: MigrationFile): Promise<void> {
  await client.query('begin')

  try {
    await client.query(migration.sql)
    await client.query(
      'insert into wca_schema_migrations (version, name, checksum_sha256) values ($1, $2, $3)',
      [migration.version, migration.name, migration.checksumSha256],
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  }
}
