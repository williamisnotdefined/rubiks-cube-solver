import { describe, expect, it, vi } from 'vitest'
import { createLoadWcaStagingService, LoadWcaStagingError } from '../load-wca-staging.service.js'

describe('LoadWcaStagingService', () => {
  it('loads known extracted TSV files through the staging loader', async () => {
    const loadFile = vi.fn(async ({ definition }) => ({
      fileName: definition.fileName,
      rowCount: 2,
      stagingTable: definition.stagingTable,
    }))
    const service = createLoadWcaStagingService({ loadFile })

    await expect(service.execute({
      files: [{ fileName: 'WCA_export_Events.tsv', localPath: '/tmp/events.tsv' }],
      importRunId: '11111111-1111-4111-8111-111111111111',
    })).resolves.toEqual({
      files: [{ fileName: 'WCA_export_Events.tsv', rowCount: 2, stagingTable: 'wca_staging_events' }],
      totalRows: 2,
    })
    expect(loadFile).toHaveBeenCalledTimes(1)
  })

  it('rejects unknown TSV files', async () => {
    const service = createLoadWcaStagingService({ loadFile: vi.fn() })

    await expect(service.execute({
      files: [{ fileName: 'unknown.tsv', localPath: '/tmp/unknown.tsv' }],
      importRunId: '11111111-1111-4111-8111-111111111111',
    })).rejects.toThrow(LoadWcaStagingError)
  })
})
