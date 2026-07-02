import { describe, expect, it } from 'vitest'
import type { MigrationFile } from '../discover-migrations.js'
import { planMigrations } from '../migration-runner.js'

describe('planMigrations', () => {
  it('splits pending and already applied migrations', () => {
    const migrations = [migration('0001', 'aaa'), migration('0002', 'bbb')]

    expect(planMigrations(migrations, [{ checksum_sha256: 'aaa', version: '0001' }])).toEqual({
      applied: ['0002'],
      skipped: ['0001'],
    })
  })

  it('rejects checksum drift for applied migrations', () => {
    expect(() => planMigrations([migration('0001', 'aaa')], [{ checksum_sha256: 'changed', version: '0001' }])).toThrow(
      'Migration checksum mismatch for version 0001',
    )
  })
})

function migration(version: string, checksumSha256: string): MigrationFile {
  return {
    checksumSha256,
    fileName: `${version}_test.sql`,
    name: 'test',
    path: `/tmp/${version}_test.sql`,
    sql: 'select 1;',
    version,
  }
}
