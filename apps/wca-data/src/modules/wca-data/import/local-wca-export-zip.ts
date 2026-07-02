import { stat } from 'node:fs/promises'
import { z } from 'zod'
import type { ZipReader } from '../../../infra/archive/zip-reader.js'
import type { WcaExportClient } from '../../../infra/http/wca-export-client.js'
import type { WcaExportMetadata } from '../domain/export-metadata.js'

const metadataSchema = z.object({
  export_date: z.string().min(1),
  export_format_version: z.string().min(1),
}).passthrough()

export class LocalWcaExportZipError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'LocalWcaExportZipError'
    this.code = code
  }
}

export function createLocalWcaExportZipClient({
  sourceZipPath,
  zipReader,
}: {
  sourceZipPath: string
  zipReader: ZipReader
}): WcaExportClient {
  return {
    async getPublicExportMetadata(): Promise<WcaExportMetadata> {
      return readLocalWcaExportZipMetadata({ sourceZipPath, zipReader })
    },
  }
}

export async function readLocalWcaExportZipMetadata({
  sourceZipPath,
  zipReader,
}: {
  sourceZipPath: string
  zipReader: ZipReader
}): Promise<WcaExportMetadata> {
  const [archiveStats, metadataJson, readme] = await Promise.all([
    stat(sourceZipPath),
    readZipTextEntry({ sourceZipPath, zipReader, fileName: 'metadata.json' }),
    readZipTextEntry({ sourceZipPath, zipReader, fileName: 'README.md' }).catch(() => 'Local WCA TSV export archive.'),
  ])
  const metadata = metadataSchema.safeParse(JSON.parse(metadataJson))

  if (!metadata.success) {
    throw new LocalWcaExportZipError('invalid_local_wca_export_metadata', 'Local WCA export metadata.json is invalid')
  }

  const exportDate = normalizeExportDate(metadata.data.export_date)

  return {
    developerUrl: null,
    exportDate,
    exportFormatVersion: metadata.data.export_format_version,
    exportVersion: metadata.data.export_format_version,
    readme,
    sqlFilesizeBytes: null,
    sqlUrl: null,
    tsvFilesizeBytes: archiveStats.size,
    tsvUrl: `file://${sourceZipPath}`,
  }
}

async function readZipTextEntry({
  fileName,
  sourceZipPath,
  zipReader,
}: {
  fileName: string
  sourceZipPath: string
  zipReader: ZipReader
}): Promise<string> {
  for await (const entry of zipReader.entries(sourceZipPath)) {
    if (entry.fileName === fileName) {
      const chunks: Buffer[] = []
      const stream = await entry.openReadStream()

      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }

      return Buffer.concat(chunks).toString('utf8')
    }
  }

  throw new LocalWcaExportZipError('local_wca_export_zip_entry_missing', `Local WCA export archive is missing ${fileName}`)
}

function normalizeExportDate(value: string): string {
  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    throw new LocalWcaExportZipError('invalid_local_wca_export_metadata', 'Local WCA export metadata export_date is invalid')
  }

  return new Date(timestamp).toISOString()
}
