import type { DatasetPublisher } from '../../publish/publish-dataset.service.js'
import type { Queryable } from './queryable.js'

export type TransactionalQueryPool = {
  connect: () => Promise<Queryable & { release: () => void }>
}

export class PostgresDatasetPublisher implements DatasetPublisher {
  constructor(
    private readonly transactionPool: TransactionalQueryPool,
  ) {}

  async publishDataset(input: {
    datasetId: string
    publishedAt: Date
  }): Promise<void> {
    const connection = await this.transactionPool.connect()
    const transaction = connection
    let transactionStarted = false

    try {
      await transaction.query('begin')
      transactionStarted = true
      const candidate = await transaction.query<{ id: string }>(`
        select id
        from wca_dataset_versions
        where id = $1
          and is_active = false
          and status = 'ready'
        for update
      `, [input.datasetId])

      if (candidate.rows.length !== 1) {
        throw new Error(`WCA dataset version is not ready: ${input.datasetId}`)
      }

      await transaction.query(`
        update wca_dataset_versions
        set is_active = false, status = 'retired'
        where is_active = true and id <> $1
      `, [input.datasetId])
      const activated = await transaction.query<{ id: string }>(`
        update wca_dataset_versions
        set
          is_active = true,
          status = 'active',
          published_at = $2
        where id = $1
        returning id
      `, [input.datasetId, input.publishedAt.toISOString()])

      if (activated.rows.length !== 1) {
        throw new Error(`WCA dataset version not found: ${input.datasetId}`)
      }
      await transaction.query('commit')
    } catch (error) {
      if (transactionStarted) {
        await transaction.query('rollback')
      }
      throw error
    } finally {
      connection.release()
    }
  }
}
