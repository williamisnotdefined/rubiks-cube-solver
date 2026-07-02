import { describe, expect, it, vi } from 'vitest'
import { createPublishDatasetService } from '../publish-dataset.service.js'

describe('PublishDatasetService', () => {
  it('publishes a canonical dataset atomically through the publisher', async () => {
    const publishDataset = vi.fn(async () => {})
    const service = createPublishDatasetService({
      clock: { now: () => new Date('2026-06-30T12:00:00Z') },
      publisher: { publishDataset },
    })

    await expect(service.execute({ datasetId: 'dataset-1' })).resolves.toEqual({
      publishedAt: '2026-06-30T12:00:00.000Z',
    })
    expect(publishDataset).toHaveBeenCalledWith({
      datasetId: 'dataset-1',
      publishedAt: new Date('2026-06-30T12:00:00Z'),
    })
  })
})
