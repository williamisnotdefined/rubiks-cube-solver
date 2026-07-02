import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import type { ExtractWcaExportService } from './extract-wca-export.service.js'
import type { DownloadWcaExportService } from './download-wca-export.service.js'
import type { WcaStagingFile } from './load-wca-staging.service.js'
import { getWcaTsvDefinitionByFileName } from './wca-tsv-registry.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'

export type PrepareWcaSourceFilesInput = {
  importRunId: string
  remote: WcaExportMetadata
}

export type PrepareWcaSourceFilesResult = {
  files: WcaStagingFile[]
  log: Record<string, unknown>
}

export type WcaSourceFilesService = {
  execute: (input: PrepareWcaSourceFilesInput) => Promise<PrepareWcaSourceFilesResult>
}

export function createStaticWcaSourceFilesService(files: readonly WcaStagingFile[]): WcaSourceFilesService {
  return {
    async execute(): Promise<PrepareWcaSourceFilesResult> {
      return { files: [...files], log: { source: 'static-fixture', sourceFileCount: files.length } }
    },
  }
}

export function createDownloadedWcaSourceFilesService({
  download,
  extract,
}: {
  download: DownloadWcaExportService
  extract: ExtractWcaExportService
}): WcaSourceFilesService {
  return {
    async execute(input: PrepareWcaSourceFilesInput): Promise<PrepareWcaSourceFilesResult> {
      const downloadResult = await download.execute({ importRunId: input.importRunId, remote: input.remote })
      const extractResult = await extract.execute({
        archiveLocalPath: downloadResult.localPath,
        importRunId: input.importRunId,
      })
      const sourceFiles = extractResult.files
        .filter(({ fileName }) => getWcaTsvDefinitionByFileName(fileName) !== null)
        .map(({ fileName, localPath }) => ({ fileName, localPath }))

      return {
        files: sourceFiles,
        log: {
          archiveByteSize: downloadResult.byteSize,
          archiveSha256: downloadResult.sha256,
          archiveStorageKey: downloadResult.storageKey,
          extractedDir: extractResult.extractedDir,
          extractedFileCount: extractResult.files.length,
          ignoredFileCount: extractResult.files.length - sourceFiles.length,
          source: 'downloaded-tsv-zip',
          sourceFileCount: sourceFiles.length,
        },
      }
    },
  }
}

export function createLocalZipWcaSourceFilesService({
  extract,
  sourceZipPath,
}: {
  extract: ExtractWcaExportService
  sourceZipPath: string
}): WcaSourceFilesService {
  return {
    async execute(input: PrepareWcaSourceFilesInput): Promise<PrepareWcaSourceFilesResult> {
      const [archiveStats, archiveSha256, extractResult] = await Promise.all([
        stat(sourceZipPath),
        sha256File(sourceZipPath),
        extract.execute({ archiveLocalPath: sourceZipPath, importRunId: input.importRunId }),
      ])
      const sourceFiles = extractResult.files
        .filter(({ fileName }) => getWcaTsvDefinitionByFileName(fileName) !== null)
        .map(({ fileName, localPath }) => ({ fileName, localPath }))

      return {
        files: sourceFiles,
        log: {
          archiveByteSize: archiveStats.size,
          archiveLocalPath: sourceZipPath,
          archiveSha256,
          extractedDir: extractResult.extractedDir,
          extractedFileCount: extractResult.files.length,
          ignoredFileCount: extractResult.files.length - sourceFiles.length,
          source: 'local-tsv-zip',
          sourceFileCount: sourceFiles.length,
        },
      }
    },
  }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')

  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}
