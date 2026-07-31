import type { DatasetPublisher } from '../../publish/publish-dataset.service.js'
import type { CopyQueryPool } from './postgres-copy-staging-loader.js'
import type { Queryable } from './queryable.js'

export type TransactionalQueryPool = CopyQueryPool

export class PostgresDatasetPublisher implements DatasetPublisher {
  constructor(
    private readonly db: Queryable,
    private readonly transactionPool?: TransactionalQueryPool,
  ) {}

  async publishDataset(input: {
    datasetId: string
    publishedAt: Date
  }): Promise<void> {
    const connection = this.transactionPool === undefined ? null : await this.transactionPool.connect()
    const transaction = connection ?? this.db

    await transaction.query('begin')

    try {
      await transaction.query(`
        update wca_dataset_versions
        set is_active = false, status = 'retired'
        where is_active = true and id <> $1
      `, [input.datasetId])
      await transaction.query(`
        update wca_dataset_versions
        set
          is_active = true,
          status = 'active',
          published_at = $2
        where id = $1
      `, [input.datasetId, input.publishedAt.toISOString()])
      await transaction.query('commit')
    } catch (error) {
      await transaction.query('rollback')
      throw error
    } finally {
      connection?.release()
    }
  }
}
