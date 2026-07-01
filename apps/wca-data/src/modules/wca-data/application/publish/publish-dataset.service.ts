import type { Clock } from '../../../../shared/time/clock.js'

export type PublishDatasetInput = {
  datasetId: string
}

export type PublishDatasetResult = {
  publishedAt: string
}

export type DatasetPublisher = {
  publishDataset: (input: {
    datasetId: string
    publishedAt: Date
  }) => Promise<void>
}

type PublishDatasetServiceDeps = {
  clock: Clock
  publisher: DatasetPublisher
}

export type PublishDatasetService = ReturnType<typeof createPublishDatasetService>

export function createPublishDatasetService({
  clock,
  publisher,
}: PublishDatasetServiceDeps) {
  return {
    async execute(input: PublishDatasetInput): Promise<PublishDatasetResult> {
      const publishedAt = clock.now()

      await publisher.publishDataset({
        datasetId: input.datasetId,
        publishedAt,
      })

      return {
        publishedAt: publishedAt.toISOString(),
      }
    },
  }
}
