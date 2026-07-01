import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sha256Hex } from '../../shared/crypto/sha256.js'

const migrationFilePattern = /^(\d{4})_([a-z0-9_]+)\.sql$/

export type MigrationFile = {
  checksumSha256: string
  fileName: string
  name: string
  path: string
  sql: string
  version: string
}

export function parseMigrationFileName(fileName: string): Pick<MigrationFile, 'name' | 'version'> | null {
  const match = migrationFilePattern.exec(fileName)

  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null
  }

  return { name: match[2], version: match[1] }
}

export async function discoverMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true })
  const migrationFileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => parseMigrationFileName(fileName) !== null)
    .sort((left, right) => left.localeCompare(right))

  const migrations = await Promise.all(
    migrationFileNames.map(async (fileName) => {
      const parsed = parseMigrationFileName(fileName)

      if (parsed === null) {
        throw new Error(`Invalid migration file name: ${fileName}`)
      }

      const path = join(migrationsDir, fileName)
      const sql = await readFile(path, 'utf8')

      return {
        checksumSha256: sha256Hex(sql),
        fileName,
        name: parsed.name,
        path,
        sql,
        version: parsed.version,
      }
    }),
  )

  ensureUniqueMigrationVersions(migrations)

  return migrations
}

function ensureUniqueMigrationVersions(migrations: MigrationFile[]): void {
  const seen = new Set<string>()

  for (const migration of migrations) {
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`)
    }

    seen.add(migration.version)
  }
}
