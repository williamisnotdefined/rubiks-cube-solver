import type { DatasetPublisher } from '../../application/publish/publish-dataset.service.js'
import type { Queryable } from './queryable.js'

export class PostgresDatasetPublisher implements DatasetPublisher {
  constructor(private readonly db: Queryable) {}

  async publishDataset(input: {
    datasetId: string
    publishedAt: Date
  }): Promise<void> {
    await this.db.query('begin')

    try {
      await this.db.query(`
        update wca_dataset_versions
        set is_active = false, status = 'retired'
        where is_active = true and id <> $1
      `, [input.datasetId])
      await this.db.query(`
        update wca_dataset_versions
        set
          is_active = true,
          status = 'active',
          published_at = $2
        where id = $1
      `, [input.datasetId, input.publishedAt.toISOString()])
      await this.db.query('commit')
    } catch (error) {
      await this.db.query('rollback')
      throw error
    }
  }
}
