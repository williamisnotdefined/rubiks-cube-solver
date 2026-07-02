import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import type { ZipEntry, ZipReader } from '../../../../infra/archive/zip-reader.js'
import { createExtractWcaExportService } from '../extract-wca-export.service.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('ExtractWcaExportService', () => {
  it('extracts expected files and ignores unrelated safe files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-extract-'))
    const service = createExtractWcaExportService({
      expectedFiles: ['metadata.json', 'README.md'],
      storageRootDir: tempDir,
      zipReader: zipReader([
        fileEntry('metadata.json', '{"export":"ok"}'),
        fileEntry('README.md', 'readme'),
        fileEntry('notes.txt', 'ignored'),
      ]),
    })

    const result = await service.execute({ archiveLocalPath: '/tmp/archive.zip', importRunId: 'run-1' })

    expect(result.files.map((file) => file.fileName)).toEqual(['metadata.json', 'README.md'])
    await expect(readFile(result.files[0]?.localPath ?? '', 'utf8')).resolves.toBe('{"export":"ok"}')
    expect(result.files[0]?.storageKey).toBe('imports/run-1/extracted/metadata.json')
  })

  it('extracts expected files from a directory-prefixed archive', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-extract-'))
    const service = createExtractWcaExportService({
      expectedFiles: ['metadata.json', 'README.md'],
      storageRootDir: tempDir,
      zipReader: zipReader([
        directoryEntry('WCA_export/'),
        fileEntry('WCA_export/metadata.json', '{"export":"ok"}'),
        fileEntry('WCA_export/README.md', 'readme'),
      ]),
    })

    const result = await service.execute({ archiveLocalPath: '/tmp/archive.zip', importRunId: 'run-1' })

    expect(result.files.map((file) => file.fileName)).toEqual(['metadata.json', 'README.md'])
    await expect(readFile(result.files[0]?.localPath ?? '', 'utf8')).resolves.toBe('{"export":"ok"}')
    expect(result.files[0]?.storageKey).toBe('imports/run-1/extracted/metadata.json')
  })

  it('rejects path traversal entries even when they are not expected files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-extract-'))
    const service = createExtractWcaExportService({
      expectedFiles: ['metadata.json'],
      storageRootDir: tempDir,
      zipReader: zipReader([fileEntry('../metadata.json', 'bad')]),
    })

    await expect(service.execute({ archiveLocalPath: '/tmp/archive.zip', importRunId: 'run-1' })).rejects.toMatchObject({
      code: 'wca_export_extract_failed',
    })
  })

  it('reports missing expected files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-extract-'))
    const service = createExtractWcaExportService({
      expectedFiles: ['metadata.json', 'README.md'],
      storageRootDir: tempDir,
      zipReader: zipReader([fileEntry('metadata.json', '{}')]),
    })

    await expect(service.execute({ archiveLocalPath: '/tmp/archive.zip', importRunId: 'run-1' })).rejects.toMatchObject({
      code: 'wca_export_extract_missing_files',
    })
  })
})

function zipReader(entries: ZipEntry[]): ZipReader {
  return {
    async *entries() {
      for (const entry of entries) {
        yield entry
      }
    },
  }
}

function fileEntry(fileName: string, content: string): ZipEntry {
  return {
    fileName,
    isDirectory: false,
    openReadStream: async () => Readable.from([content]),
  }
}

function directoryEntry(fileName: string): ZipEntry {
  return {
    fileName,
    isDirectory: true,
    openReadStream: async () => Readable.from([]),
  }
}
