import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { WcaExportClient } from '../../../infra/http/wca-export-client.js'
import { safeJoin } from '../../../shared/files/safe-path.js'
import type { WcaStagingFile } from '../application/import/load-wca-staging.service.js'
import { wcaTsvFileDefinitions } from '../application/import/wca-tsv-registry.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'

export function defaultFixtureWcaExportDir(): string {
  return join(process.cwd(), 'fixtures', 'wca-export-v2')
}

export function fixtureWcaExportFiles(fixtureDir: string): WcaStagingFile[] {
  return wcaTsvFileDefinitions.map((definition) => ({
    fileName: definition.fileName,
    localPath: safeJoin(fixtureDir, definition.fileName),
  }))
}

export function createFixtureWcaExportClient(fixtureDir: string): WcaExportClient {
  return {
    async getPublicExportMetadata(): Promise<WcaExportMetadata> {
      const tsvFilesizeBytes = await fixtureTsvFilesizeBytes(fixtureDir)

      return {
        exportDate: '2026-06-30T00:00:16Z',
        exportFormatVersion: 'v2.0.2',
        exportVersion: 'v2.0.2',
        readme: 'Fixture TSV export for local WCA Data sync.',
        sqlFilesizeBytes: null,
        sqlUrl: null,
        tsvFilesizeBytes,
        tsvUrl: pathToFileURL(resolve(fixtureDir)).href,
      }
    },
  }
}

async function fixtureTsvFilesizeBytes(fixtureDir: string): Promise<number> {
  const stats = await Promise.all(fixtureWcaExportFiles(fixtureDir).map((file) => stat(file.localPath)))
  return stats.reduce((sum, fileStat) => sum + fileStat.size, 0)
}
