import { describe, expect, it, vi } from 'vitest'
import { createWcaExportClient, normalizeWcaExportMetadata, WcaExportClientError } from '../wca-export-client.js'

describe('normalizeWcaExportMetadata', () => {
  it('normalizes the public WCA export metadata payload', () => {
    expect(normalizeWcaExportMetadata(wcaPayload())).toEqual({
      developerUrl: 'https://exports.worldcubeassociation.org/developer/wca-developer-database-dump.zip',
      exportDate: '2026-06-30T00:00:16Z',
      exportFormatVersion: 'v2.0.2',
      exportVersion: 'v2.0.2',
      readme: 'Readme text',
      sqlFilesizeBytes: 377151985,
      sqlUrl: 'https://www.worldcubeassociation.org/export/results/v2/sql',
      tsvFilesizeBytes: 364734563,
      tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
    })
  })

  it('rejects unsupported export format major versions', () => {
    expect(() => normalizeWcaExportMetadata({ ...wcaPayload(), export_version: 'v3.0.0' })).toThrow(WcaExportClientError)
  })

  it('rejects invalid payloads', () => {
    expect(() => normalizeWcaExportMetadata({ ...wcaPayload(), tsv_url: 'not-a-url' })).toThrow(WcaExportClientError)
  })
})

describe('createWcaExportClient', () => {
  it('fetches and validates public WCA export metadata', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(wcaPayload()))
    const client = createWcaExportClient({ fetchFn, metadataUrl: 'https://example.test/export' })

    await expect(client.getPublicExportMetadata()).resolves.toMatchObject({
      exportDate: '2026-06-30T00:00:16Z',
      tsvUrl: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
    })
    expect(fetchFn).toHaveBeenCalledWith('https://example.test/export', expect.objectContaining({
      headers: { accept: 'application/json' },
    }))
  })

  it('raises a typed error for HTTP failures', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 503 }))
    const client = createWcaExportClient({ fetchFn, metadataUrl: 'https://example.test/export' })

    await expect(client.getPublicExportMetadata()).rejects.toMatchObject({
      code: 'wca_export_metadata_http_error',
    })
  })
})

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

function wcaPayload() {
  return {
    export_date: '2026-06-30T00:00:16Z',
    developer_url: 'https://exports.worldcubeassociation.org/developer/wca-developer-database-dump.zip',
    export_version: 'v2.0.2',
    readme: 'Readme text',
    sql_filesize_bytes: 377151985,
    sql_url: 'https://www.worldcubeassociation.org/export/results/v2/sql',
    tsv_filesize_bytes: 364734563,
    tsv_url: 'https://www.worldcubeassociation.org/export/results/v2/tsv',
  }
}
