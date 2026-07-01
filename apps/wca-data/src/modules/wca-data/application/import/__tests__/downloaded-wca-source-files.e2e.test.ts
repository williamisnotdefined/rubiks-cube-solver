import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { YauzlZipReader } from '../../../../../infra/archive/yauzl-zip-reader.js'
import type { WcaExportMetadata } from '../../../domain/export-metadata.js'
import { InMemoryDatasetVersionRepository } from '../../../persistence/in-memory-dataset-version.repository.js'
import { InMemoryImportRunRepository } from '../../../persistence/in-memory-import-run.repository.js'
import { InMemoryWcaImportRepository } from '../../../persistence/in-memory-wca-import.repository.js'
import { createPublishDatasetService } from '../../publish/publish-dataset.service.js'
import { createCleanupImportArtifactsService } from '../cleanup-import-artifacts.service.js'
import { createDownloadWcaExportService } from '../download-wca-export.service.js'
import { createExtractWcaExportService } from '../extract-wca-export.service.js'
import { createLoadWcaStagingService } from '../load-wca-staging.service.js'
import { createLocalWcaExportZipClient } from '../local-wca-export-zip.js'
import { createSyncWcaExportService } from '../sync-wca-export.service.js'
import { createTransformGeneralCanonicalService } from '../transform-general-canonical.service.js'
import { requiredWcaExportFiles } from '../wca-export-files.js'
import { defaultFixtureWcaExportDir } from '../../../fixtures/wca-export-fixture.js'
import { getWcaTsvDefinitionByFileName, wcaTsvFileDefinitions } from '../wca-tsv-registry.js'
import { createDownloadedWcaSourceFilesService, createLocalZipWcaSourceFilesService } from '../wca-source-files.service.js'
import { createLocalWcaSyncCycleService } from '../wca-sync-cycle.service.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('downloaded WCA source files ZIP E2E', () => {
  it('downloads a ZIP fixture, extracts TSV files, and publishes canonical data', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-downloaded-source-'))
    const archive = await createFixtureExportZip()
    const fetchFn = vi.fn(async () => response(archive, { 'content-length': String(archive.byteLength) }))
    const clock = { now: () => new Date('2026-06-30T12:00:00Z') }
    const datasets = new InMemoryDatasetVersionRepository(() => 'zip-dataset-1')
    const importRuns = new InMemoryImportRunRepository(() => 'zip-import-run-1')
    const importRepository = new InMemoryWcaImportRepository()
    const service = createSyncWcaExportService({
      clock,
      datasets,
      exportClient: { getPublicExportMetadata: async () => remoteMetadata(archive.byteLength) },
      importRuns,
      syncCycle: createLocalWcaSyncCycleService({
        cleanupImportArtifacts: createCleanupImportArtifactsService({ storageRootDir: tempDir }),
        clock,
        datasetVersions: datasets,
        importRuns,
        loadStaging: createLoadWcaStagingService(importRepository),
        publishDataset: createPublishDatasetService({ clock, publisher: datasets }),
        runMode: 'zip-fixture',
        sourceFiles: createDownloadedWcaSourceFilesService({
          download: createDownloadWcaExportService({ fetchFn, storageRootDir: tempDir }),
          extract: createExtractWcaExportService({ storageRootDir: tempDir, zipReader: new YauzlZipReader() }),
        }),
        transformGeneral: createTransformGeneralCanonicalService(importRepository),
      }),
    })

    const result = await service.execute({ force: true, reason: 'manual' })

    expect(result).toMatchObject({
      dataset: {
        exportDate: '2026-06-30T00:00:16Z',
        exportVersion: 'v2.0.2',
        id: 'zip-dataset-1',
        publishedAt: '2026-06-30T12:00:00.000Z',
      },
      importRun: {
        id: 'zip-import-run-1',
        status: 'published',
      },
      publish: { publishedAt: '2026-06-30T12:00:00.000Z' },
      staging: { totalRows: 35 },
      status: 'published',
      transform: {
        championships: 1,
        competitions: 3,
        continents: 2,
        countries: 2,
        events: 2,
        formats: 1,
        persons: 4,
        ranksAverage: 1,
        ranksSingle: 1,
        resultAttempts: 13,
        results: 3,
        roundTypes: 1,
        scrambles: 1,
      },
    })
    const expectedTsvFileNames = requiredWcaExportFiles.filter((fileName) => getWcaTsvDefinitionByFileName(fileName) !== null)
    expect(result.staging.files.map((file) => file.fileName)).toEqual(wcaTsvFileDefinitions.map((definition) => definition.fileName))
    expect(result.importRun.log).toMatchObject({
      mode: 'zip-fixture',
      cleanup: {
        removed: true,
        storageKey: 'imports/zip-import-run-1',
      },
      sourceFiles: {
        archiveByteSize: archive.byteLength,
        archiveSha256: sha256(archive),
        archiveStorageKey: 'imports/zip-import-run-1/wca-export.tsv.zip',
        extractedFileCount: requiredWcaExportFiles.length,
        ignoredFileCount: requiredWcaExportFiles.length - expectedTsvFileNames.length,
        source: 'downloaded-tsv-zip',
        sourceFileCount: wcaTsvFileDefinitions.length,
      },
    })
    expect(fetchFn).toHaveBeenCalledWith(remoteMetadata(archive.byteLength).tsvUrl, expect.objectContaining({
      headers: expect.objectContaining({
        accept: 'application/zip, application/octet-stream, */*',
        'user-agent': expect.stringContaining('Mozilla/5.0'),
      }),
    }))

    const countries = await importRepository.listCountries('zip-dataset-1')
    const ranks = await importRepository.listRankDocuments('zip-dataset-1')
    await expect(readFile(join(tempDir, 'imports', 'zip-import-run-1', 'wca-export.tsv.zip'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(countries).toHaveLength(2)
    expect(ranks.find((rank) => rank.path === 'rank/world/single/333.json')?.items).toHaveLength(1)
  })

  it('imports from an official local TSV ZIP without downloading', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-local-source-'))
    const archive = await createFixtureExportZip()
    const archivePath = join(tempDir, 'WCA_export_v2_181_20260630T000016Z.tsv.zip')
    const clock = { now: () => new Date('2026-06-30T12:00:00Z') }
    const datasets = new InMemoryDatasetVersionRepository(() => 'local-dataset-1')
    const importRuns = new InMemoryImportRunRepository(() => 'local-import-run-1')
    const importRepository = new InMemoryWcaImportRepository()
    const zipReader = new YauzlZipReader()
    await writeFile(archivePath, archive)

    const service = createSyncWcaExportService({
      clock,
      datasets,
      exportClient: createLocalWcaExportZipClient({ sourceZipPath: archivePath, zipReader }),
      importRuns,
      syncCycle: createLocalWcaSyncCycleService({
        cleanupImportArtifacts: createCleanupImportArtifactsService({ storageRootDir: tempDir }),
        clock,
        datasetVersions: datasets,
        importRuns,
        loadStaging: createLoadWcaStagingService(importRepository),
        publishDataset: createPublishDatasetService({ clock, publisher: datasets }),
        runMode: 'local-zip',
        sourceFiles: createLocalZipWcaSourceFilesService({
          extract: createExtractWcaExportService({ storageRootDir: tempDir, zipReader }),
          sourceZipPath: archivePath,
        }),
        transformGeneral: createTransformGeneralCanonicalService(importRepository),
      }),
    })

    const result = await service.execute({ force: true, reason: 'manual' })

    expect(result).toMatchObject({
      dataset: {
        exportDate: '2026-06-30T00:00:16.000Z',
        exportVersion: 'v2.0.2',
        id: 'local-dataset-1',
        publishedAt: '2026-06-30T12:00:00.000Z',
      },
      importRun: {
        id: 'local-import-run-1',
        status: 'published',
      },
      staging: { totalRows: 35 },
      status: 'published',
    })
    expect(result.importRun.log).toMatchObject({
      mode: 'local-zip',
      sourceFiles: {
        archiveByteSize: archive.byteLength,
        archiveLocalPath: archivePath,
        archiveSha256: sha256(archive),
        source: 'local-tsv-zip',
        sourceFileCount: wcaTsvFileDefinitions.length,
      },
    })
    await expect(readFile(archivePath)).resolves.toEqual(archive)
  })

  it('rejects path traversal from a real ZIP archive', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-downloaded-source-'))
    const archivePath = join(tempDir, 'unsafe.zip')
    await writeFile(archivePath, createStoredZip([{ content: Buffer.from('bad'), fileName: '../metadata.json' }]))
    const service = createExtractWcaExportService({
      expectedFiles: ['metadata.json'],
      storageRootDir: tempDir,
      zipReader: new YauzlZipReader(),
    })

    await expect(service.execute({ archiveLocalPath: archivePath, importRunId: 'run-1' })).rejects.toMatchObject({
      code: 'wca_export_extract_failed',
    })
  })
})

async function createFixtureExportZip(): Promise<Buffer> {
  const fixtureDir = defaultFixtureWcaExportDir()
  const entries = await Promise.all(requiredWcaExportFiles.map(async (fileName) => ({
    content: await fixtureZipEntryContent(fixtureDir, fileName),
    fileName,
  })))

  return createStoredZip(entries)
}

async function fixtureZipEntryContent(fixtureDir: string, fileName: string): Promise<Buffer> {
  const definition = getWcaTsvDefinitionByFileName(fileName)

  if (definition !== null) {
    return readFile(join(fixtureDir, definition.fileName))
  }

  switch (fileName) {
    case 'WCA_export_scrambles.tsv':
      return Buffer.from('competitionId\teventId\troundTypeId\tgroupId\tisExtra\tscrambleNum\tscramble\n')
    case 'WCA_export_eligible_country_iso2s_for_championship.tsv':
      return Buffer.from('championshipType\teligibleCountryIso2\n')
    case 'metadata.json':
      return Buffer.from('{"export_date":"2026-06-30 00:00:16 UTC","export_format_version":"v2.0.2"}\n')
    case 'README.md':
      return Buffer.from('Fixture ZIP export for local WCA Data sync tests.\n')
    default:
      throw new Error(`Unhandled WCA export fixture file: ${fileName}`)
  }
}

function response(body: Buffer, headers: Record<string, string>): Response {
  return new Response(body, { headers, status: 200 })
}

function remoteMetadata(tsvFilesizeBytes: number): WcaExportMetadata {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Fixture TSV ZIP export for local WCA Data sync.',
    sqlFilesizeBytes: null,
    sqlUrl: null,
    tsvFilesizeBytes,
    tsvUrl: 'https://example.test/wca-export.tsv.zip',
  }
}

function sha256(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex')
}

function createStoredZip(entries: Array<{ content: Buffer; fileName: string }>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const fileName = Buffer.from(entry.fileName, 'utf8')
    const content = entry.content
    const crc = crc32(content)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(content.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(fileName.length, 26)
    localHeader.writeUInt16LE(0, 28)
    localParts.push(localHeader, fileName, content)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(content.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(fileName.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, fileName)

    offset += localHeader.length + fileName.length + content.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

const crcTable = Array.from({ length: 256 }, (_value, index) => {
  let crc = index

  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }

  return crc >>> 0
})
