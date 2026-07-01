import { z } from 'zod'
import { exportFormatMajor, type WcaExportMetadata } from '../../modules/wca-data/domain/export-metadata.js'

const supportedExportFormatMajor = 2

const wcaExportMetadataPayloadSchema = z.object({
  export_date: z.string().min(1),
  export_format_version: z.string().min(1).optional(),
  export_version: z.string().min(1).optional(),
  developer_url: z.string().url().optional(),
  readme: z.string().min(1),
  sql_filesize_bytes: z.number().int().positive().optional(),
  sql_url: z.string().url().optional(),
  tsv_filesize_bytes: z.number().int().positive(),
  tsv_url: z.string().url(),
}).passthrough()

export class WcaExportClientError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'WcaExportClientError'
    this.code = code
  }
}

export type WcaExportClient = {
  getPublicExportMetadata: () => Promise<WcaExportMetadata>
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type CreateWcaExportClientDeps = {
  fetchFn?: FetchLike
  metadataUrl: string
  timeoutMs?: number
}

export function createWcaExportClient({
  fetchFn = fetch,
  metadataUrl,
  timeoutMs = 30_000,
}: CreateWcaExportClientDeps): WcaExportClient {
  return {
    async getPublicExportMetadata(): Promise<WcaExportMetadata> {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetchFn(metadataUrl, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new WcaExportClientError(
            'wca_export_metadata_http_error',
            `WCA export metadata request failed with HTTP ${response.status}`,
          )
        }

        return normalizeWcaExportMetadata(await response.json())
      } catch (error) {
        if (error instanceof WcaExportClientError) {
          throw error
        }

        throw new WcaExportClientError(
          'wca_export_metadata_fetch_error',
          error instanceof Error ? error.message : 'Failed to fetch WCA export metadata',
        )
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

export function normalizeWcaExportMetadata(payload: unknown): WcaExportMetadata {
  const parsed = wcaExportMetadataPayloadSchema.safeParse(payload)

  if (!parsed.success) {
    throw new WcaExportClientError('invalid_wca_export_metadata', 'WCA export metadata response is invalid')
  }

  if (!Number.isFinite(Date.parse(parsed.data.export_date))) {
    throw new WcaExportClientError('invalid_wca_export_metadata', 'WCA export metadata export_date is invalid')
  }

  const exportFormatVersion = parsed.data.export_format_version ?? parsed.data.export_version

  if (exportFormatVersion === undefined) {
    throw new WcaExportClientError('unsupported_wca_export_format', 'WCA export metadata does not include a format version')
  }

  const major = exportFormatMajor(exportFormatVersion)

  if (major !== supportedExportFormatMajor) {
    throw new WcaExportClientError(
      'unsupported_wca_export_format',
      `Unsupported WCA export format version: ${exportFormatVersion}`,
    )
  }

  return {
    developerUrl: parsed.data.developer_url ?? null,
    exportDate: parsed.data.export_date,
    exportFormatVersion,
    exportVersion: parsed.data.export_version ?? exportFormatVersion,
    readme: parsed.data.readme,
    sqlFilesizeBytes: parsed.data.sql_filesize_bytes ?? null,
    sqlUrl: parsed.data.sql_url ?? null,
    tsvFilesizeBytes: parsed.data.tsv_filesize_bytes,
    tsvUrl: parsed.data.tsv_url,
  }
}
