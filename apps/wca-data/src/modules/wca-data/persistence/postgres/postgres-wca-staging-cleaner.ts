import type { CleanupWcaStagingResult, WcaStagingCleaner } from '../../import/cleanup-wca-staging.service.js'
import type { Queryable } from './queryable.js'

const stagingTables = [
  'wca_staging_championships',
  'wca_staging_competitions',
  'wca_staging_continents',
  'wca_staging_countries',
  'wca_staging_eligible_country_iso2s_for_championship',
  'wca_staging_events',
  'wca_staging_formats',
  'wca_staging_persons',
  'wca_staging_ranks_average',
  'wca_staging_ranks_single',
  'wca_staging_result_attempts',
  'wca_staging_results',
  'wca_staging_round_types',
  'wca_staging_scrambles',
]

export class PostgresWcaStagingCleaner implements WcaStagingCleaner {
  constructor(private readonly db: Queryable) {}

  async truncate(): Promise<CleanupWcaStagingResult> {
    await this.db.query(`truncate table ${stagingTables.join(', ')}`)
    return { truncatedTableCount: stagingTables.length }
  }
}
