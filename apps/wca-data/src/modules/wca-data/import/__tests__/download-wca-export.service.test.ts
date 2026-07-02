import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WcaExportMetadata } from '../../domain/export-metadata.js'
import { createDownloadWcaExportService, DownloadWcaExportError } from '../download-wca-export.service.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('DownloadWcaExportService', () => {
  it('streams the remote TSV zip into local storage and calculates metadata', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const body = Buffer.from('zip fixture')
    const fetchFn = vi.fn(async () => response(body, { 'content-length': String(body.byteLength) }))
    const service = createDownloadWcaExportService({ fetchFn, storageRootDir: tempDir })

    const result = await service.execute({ importRunId: 'run-1', remote: remoteMetadata() })

    expect(result).toMatchObject({
      byteSize: body.byteLength,
      contentLength: body.byteLength,
      sha256: sha256(body),
      storageKey: 'imports/run-1/wca-export.tsv.zip',
    })
    await expect(readFile(result.localPath)).resolves.toEqual(body)
    expect(fetchFn).toHaveBeenCalledWith(remoteMetadata().tsvUrl, expect.objectContaining({
      headers: expect.objectContaining({
        accept: 'application/zip, application/octet-stream, */*',
        'user-agent': expect.stringContaining('Mozilla/5.0'),
      }),
    }))
  })

  it('rejects content-length mismatches', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const fetchFn = vi.fn(async () => response(Buffer.from('zip fixture'), { 'content-length': '999' }))
    const service = createDownloadWcaExportService({ fetchFn, storageRootDir: tempDir })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).rejects.toMatchObject({
      code: 'wca_export_download_size_mismatch',
    })
  })

  it('rejects unsafe import run IDs before writing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const fetchFn = vi.fn(async () => response(Buffer.from('zip fixture')))
    const service = createDownloadWcaExportService({ fetchFn, storageRootDir: tempDir })

    await expect(service.execute({ importRunId: '../run-1', remote: remoteMetadata() })).rejects.toThrow(DownloadWcaExportError)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('raises a typed error for server failures', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const fetchFn = vi.fn(async () => new Response('nope', { status: 503 }))
    const service = createDownloadWcaExportService({ fetchFn, maxAttempts: 1, storageRootDir: tempDir })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).rejects.toMatchObject({
      code: 'wca_export_download_server_error',
    })
  })

  it('raises a typed error for rate limits', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const fetchFn = vi.fn(async () => new Response('retry later', { status: 429 }))
    const service = createDownloadWcaExportService({ fetchFn, maxAttempts: 1, storageRootDir: tempDir })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).rejects.toMatchObject({
      code: 'wca_export_download_rate_limited',
    })
  })

  it('retries transient HTTP failures', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const body = Buffer.from('zip fixture')
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('retry later', { status: 500 }))
      .mockResolvedValueOnce(response(body, { 'content-length': String(body.byteLength) }))
    const service = createDownloadWcaExportService({ fetchFn, retryDelayMs: 0, storageRootDir: tempDir })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).resolves.toMatchObject({
      byteSize: body.byteLength,
      sha256: sha256(body),
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('uses retry-after before exponential backoff when retrying rate limits', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const body = Buffer.from('zip fixture')
    const delays: number[] = []
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('retry later', { headers: { 'retry-after': '2' }, status: 429 }))
      .mockResolvedValueOnce(new Response('retry later', { status: 500 }))
      .mockResolvedValueOnce(response(body, { 'content-length': String(body.byteLength) }))
    const service = createDownloadWcaExportService({
      delayFn: async (ms) => { delays.push(ms) },
      fetchFn,
      retryDelayMs: 100,
      storageRootDir: tempDir,
    })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).resolves.toMatchObject({
      byteSize: body.byteLength,
    })
    expect(delays).toEqual([2000, 200])
  })

  it('raises a typed error for timeout after retries are exhausted', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-download-'))
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    const fetchFn = vi.fn(async () => { throw abortError })
    const service = createDownloadWcaExportService({ fetchFn, maxAttempts: 1, storageRootDir: tempDir, timeoutMs: 1 })

    await expect(service.execute({ importRunId: 'run-1', remote: remoteMetadata() })).rejects.toMatchObject({
      code: 'wca_export_download_timeout',
    })
  })
})

function response(body: Buffer, headers: Record<string, string> = {}): Response {
  return new Response(body, { headers, status: 200 })
}

function sha256(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex')
}

function remoteMetadata(): WcaExportMetadata {
  return {
    exportDate: '2026-06-30T00:00:16Z',
    exportFormatVersion: 'v2.0.2',
    exportVersion: 'v2.0.2',
    readme: 'Readme text',
    sqlFilesizeBytes: 200,
    sqlUrl: 'https://www.worldcubeassociation.org/export/results/v2/sql',
    tsvFilesizeBytes: 100,
    tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
