import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, posix } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { ZipReader } from '../../../../infra/archive/zip-reader.js'
import { safeJoin } from '../../../../shared/files/safe-path.js'
import { requiredWcaExportFiles } from './wca-export-files.js'

export type ExtractWcaExportInput = {
  archiveLocalPath: string
  importRunId: string
}

export type ExtractedWcaExportFile = {
  fileName: string
  localPath: string
  storageKey: string
}

export type ExtractWcaExportResult = {
  extractedDir: string
  files: ExtractedWcaExportFile[]
}

export class ExtractWcaExportError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ExtractWcaExportError'
    this.code = code
  }
}

type ExtractWcaExportServiceDeps = {
  expectedFiles?: readonly string[]
  storageRootDir: string
  zipReader: ZipReader
}

export type ExtractWcaExportService = ReturnType<typeof createExtractWcaExportService>

export function createExtractWcaExportService({
  expectedFiles = requiredWcaExportFiles,
  storageRootDir,
  zipReader,
}: ExtractWcaExportServiceDeps) {
  const expectedFileSet = new Set(expectedFiles)

  return {
    async execute(input: ExtractWcaExportInput): Promise<ExtractWcaExportResult> {
      try {
        const extractStoragePrefix = `imports/${input.importRunId}/extracted`
        const extractedDir = safeJoin(storageRootDir, extractStoragePrefix)
        const files: ExtractedWcaExportFile[] = []
        const foundFiles = new Set<string>()

        await mkdir(extractedDir, { recursive: true })

        for await (const entry of zipReader.entries(input.archiveLocalPath)) {
          const entryName = normalizeZipEntryName(entry.fileName, entry.isDirectory)

          if (entry.isDirectory) {
            continue
          }

          safeJoin(extractedDir, entryName)

          const fileName = posix.basename(entryName)

          if (!expectedFileSet.has(fileName)) {
            continue
          }

          const storageKey = `${extractStoragePrefix}/${fileName}`
          const localPath = safeJoin(storageRootDir, storageKey)
          await mkdir(dirname(localPath), { recursive: true })
          await pipeline(await entry.openReadStream(), createWriteStream(localPath))
          foundFiles.add(fileName)
          files.push({ fileName, localPath, storageKey })
        }

        const missingFiles = expectedFiles.filter((fileName) => !foundFiles.has(fileName))
        if (missingFiles.length > 0) {
          throw new ExtractWcaExportError('wca_export_extract_missing_files', `WCA export archive is missing files: ${missingFiles.join(', ')}`)
        }

        return { extractedDir, files }
      } catch (error) {
        if (error instanceof ExtractWcaExportError) {
          throw error
        }

        throw new ExtractWcaExportError(
          'wca_export_extract_failed',
          error instanceof Error ? error.message : 'Failed to extract WCA export archive',
        )
      }
    },
  }
}

function normalizeZipEntryName(fileName: string, isDirectory: boolean): string {
  if (fileName.includes('\0') || fileName.includes('\\')) {
    throw new ExtractWcaExportError('wca_export_extract_unsafe_path', `Unsafe WCA export archive path: ${fileName}`)
  }

  const normalized = isDirectory && fileName.endsWith('/') ? fileName.slice(0, -1) : fileName

  if (normalized.length === 0) {
    throw new ExtractWcaExportError('wca_export_extract_unsafe_path', 'Unsafe empty WCA export archive path')
  }

  return normalized
}
