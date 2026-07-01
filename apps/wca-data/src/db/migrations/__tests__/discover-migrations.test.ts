import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { discoverMigrationFiles, parseMigrationFileName } from '../discover-migrations.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('parseMigrationFileName', () => {
  it('parses valid migration filenames', () => {
    expect(parseMigrationFileName('0001_create_tables.sql')).toEqual({ name: 'create_tables', version: '0001' })
  })

  it('rejects unsupported filenames', () => {
    expect(parseMigrationFileName('1_create_tables.sql')).toBeNull()
    expect(parseMigrationFileName('0001-create-tables.sql')).toBeNull()
    expect(parseMigrationFileName('0001_create_tables.txt')).toBeNull()
  })
})

describe('discoverMigrationFiles', () => {
  it('loads migrations in version order and ignores non-migration files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-migrations-'))
    await writeFile(join(tempDir, '0002_second.sql'), 'select 2;')
    await writeFile(join(tempDir, '0001_first.sql'), 'select 1;')
    await writeFile(join(tempDir, 'README.md'), 'ignore me')

    const migrations = await discoverMigrationFiles(tempDir)

    expect(migrations.map((migration) => migration.fileName)).toEqual(['0001_first.sql', '0002_second.sql'])
    expect(migrations[0]?.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects duplicate migration versions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-migrations-'))
    await writeFile(join(tempDir, '0001_first.sql'), 'select 1;')
    await writeFile(join(tempDir, '0001_duplicate.sql'), 'select 2;')

    await expect(discoverMigrationFiles(tempDir)).rejects.toThrow('Duplicate migration version: 0001')
  })
})
