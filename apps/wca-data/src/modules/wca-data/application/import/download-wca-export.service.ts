import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Readable, Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { safeJoin } from '../../../../shared/files/safe-path.js'
import type { WcaExportMetadata } from '../../domain/export-metadata.js'

export type DownloadWcaExportInput = {
  importRunId: string
  remote: WcaExportMetadata
}

export type DownloadWcaExportResult = {
  byteSize: number
  contentLength: number | null
  localPath: string
  sha256: string
  storageKey: string
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>
type DelayLike = (ms: number) => Promise<void>

type DownloadWcaExportServiceDeps = {
  delayFn?: DelayLike
  fetchFn?: FetchLike
  maxAttempts?: number
  maxRetryDelayMs?: number
  retryDelayMs?: number
  storageRootDir: string
  timeoutMs?: number
}

export class DownloadWcaExportError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'DownloadWcaExportError'
    this.code = code
  }
}

export type DownloadWcaExportService = ReturnType<typeof createDownloadWcaExportService>

export function createDownloadWcaExportService({
  delayFn = delay,
  fetchFn = fetch,
  maxAttempts = 3,
  maxRetryDelayMs = 30_000,
  retryDelayMs = 1_000,
  storageRootDir,
  timeoutMs = 120_000,
}: DownloadWcaExportServiceDeps) {
  return {
    async execute(input: DownloadWcaExportInput): Promise<DownloadWcaExportResult> {
      const storageKey = `imports/${input.importRunId}/wca-export.tsv.zip`
      const localPath = safeLocalPath(storageRootDir, storageKey)

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        try {
          const response = await fetchFn(input.remote.tsvUrl, {
            headers: browserLikeDownloadHeaders(),
            signal: controller.signal,
          })

          if (!response.ok) {
            if (shouldRetryHttpStatus(response.status) && attempt < maxAttempts) {
              await response.body?.cancel()
              await delayFn(retryDelay(response, attempt, retryDelayMs, maxRetryDelayMs))
              continue
            }

            throw httpError(response.status)
          }

          if (response.body === null) {
            throw new DownloadWcaExportError('wca_export_download_empty_body', 'WCA TSV export response did not include a body')
          }

          await mkdir(dirname(localPath), { recursive: true })

          const hashAndCount = new HashAndCountTransform()
          await pipeline(Readable.fromWeb(response.body), hashAndCount, createWriteStream(localPath))

          const contentLength = contentLengthHeader(response.headers.get('content-length'))

          if (contentLength !== null && contentLength !== hashAndCount.byteSize) {
            throw new DownloadWcaExportError(
              'wca_export_download_size_mismatch',
              `WCA TSV export size mismatch: expected ${contentLength} bytes, got ${hashAndCount.byteSize}`,
            )
          }

          return {
            byteSize: hashAndCount.byteSize,
            contentLength,
            localPath,
            sha256: hashAndCount.sha256(),
            storageKey,
          }
        } catch (error) {
          if (error instanceof DownloadWcaExportError) {
            throw error
          }

          if (attempt < maxAttempts) {
            await delayFn(retryDelayMs)
            continue
          }

          if (error instanceof Error && error.name === 'AbortError') {
            throw new DownloadWcaExportError('wca_export_download_timeout', `WCA TSV export download timed out after ${timeoutMs}ms`)
          }

          throw new DownloadWcaExportError(
            'wca_export_download_failed',
            error instanceof Error ? error.message : 'Failed to download WCA TSV export',
          )
        } finally {
          clearTimeout(timeout)
        }
      }

      throw new DownloadWcaExportError('wca_export_download_failed', 'Failed to download WCA TSV export')
    },
  }
}

function safeLocalPath(storageRootDir: string, storageKey: string): string {
  try {
    return safeJoin(storageRootDir, storageKey)
  } catch (error) {
    throw new DownloadWcaExportError(
      'wca_export_download_failed',
      error instanceof Error ? error.message : 'Failed to prepare WCA TSV export path',
    )
  }
}

function shouldRetryHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

function httpError(status: number): DownloadWcaExportError {
  if (status === 429) {
    return new DownloadWcaExportError('wca_export_download_rate_limited', 'WCA TSV export download was rate limited with HTTP 429')
  }

  if (status >= 500 && status <= 599) {
    return new DownloadWcaExportError('wca_export_download_server_error', `WCA TSV export download failed with HTTP ${status}`)
  }

  return new DownloadWcaExportError('wca_export_download_http_error', `WCA TSV export download failed with HTTP ${status}`)
}

function browserLikeDownloadHeaders(): Record<string, string> {
  return {
    accept: 'application/zip, application/octet-stream, */*',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  }
}

function retryDelay(response: Response, attempt: number, retryDelayMs: number, maxRetryDelayMs: number): number {
  const retryAfterMs = retryAfterDelayMs(response.headers.get('retry-after'))

  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, maxRetryDelayMs)
  }

  return Math.min(retryDelayMs * (2 ** Math.max(0, attempt - 1)), maxRetryDelayMs)
}

function retryAfterDelayMs(value: string | null): number | null {
  if (value === null) {
    return null
  }

  const seconds = Number(value)

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000)
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.max(0, timestamp - Date.now())
}

function delay(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms))
}

function contentLengthHeader(value: string | null): number | null {
  if (value === null) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

class HashAndCountTransform extends Transform {
  byteSize = 0
  private readonly hash = createHash('sha256')

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.byteSize += chunk.byteLength
    this.hash.update(chunk)
    callback(null, chunk)
  }

  sha256(): string {
    return this.hash.digest('hex')
  }
}
