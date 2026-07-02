import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WCA control schema migrations', () => {
  it('defines atomic dataset publish fields and statuses', async () => {
    const sql = await migrationSql('0001_create_wca_dataset_versions.sql')

    expect(sql).toContain('id uuid primary key')
    expect(sql).toContain("status in ('building', 'validating', 'ready', 'active', 'failed', 'retired')")
    expect(sql).toContain('is_active boolean not null default false')
    expect(sql).toContain('document_count integer not null default 0')
    expect(sql).toContain('total_bytes bigint not null default 0')
    expect(sql).toContain('wca_dataset_versions_one_active_idx')
  })

  it('defines WCA import run fields and statuses', async () => {
    const sql = await migrationSql('0002_create_wca_import_runs.sql')

    expect(sql).toContain('id uuid primary key')
    expect(sql).toContain("reason text not null check (reason in ('schedule', 'manual', 'retry', 'test'))")
    expect(sql).toContain("status text not null check (status in ('checking', 'skipped', 'running', 'imported', 'built', 'validated', 'published', 'failed'))")
    expect(sql).toContain('remote_export_date timestamptz')
    expect(sql).toContain('log jsonb not null default')
  })

  it('defines fixed staging tables for WCA TSV imports', async () => {
    const sql = await migrationSql('0004_create_wca_staging_tables.sql')

    expect(sql).toContain('create table wca_staging_continents')
    expect(sql).toContain('create table wca_staging_result_attempts')
    expect(sql).toContain('create table wca_staging_ranks_average')
    expect(sql).toContain('import_run_id uuid not null references wca_import_runs')
    expect(sql).toContain('create index wca_staging_results_run_idx')
  })

  it('defines dataset-scoped canonical tables for general WCA data', async () => {
    const sql = await migrationSql('0005_create_wca_general_canonical_tables.sql')

    expect(sql).toContain('create table wca_continents')
    expect(sql).toContain('create table wca_countries')
    expect(sql).toContain('create table wca_events')
    expect(sql).toContain('create table wca_round_types')
    expect(sql).toContain('create table wca_formats')
    expect(sql).toContain('primary key (dataset_id, id)')
    expect(sql).toContain("format text not null check (format in ('time', 'number', 'multi'))")
    expect(sql).toContain('wca_events_dataset_rank_idx')
    expect(sql).toContain('wca_round_types_dataset_rank_idx')
    expect(sql).toContain('wca_formats_dataset_name_idx')
  })

  it('defines dataset-scoped canonical tables for competitions and championships', async () => {
    const sql = await migrationSql('0006_create_wca_competition_canonical_tables.sql')

    expect(sql).toContain('create table wca_competitions')
    expect(sql).toContain('create table wca_championships')
    expect(sql).toContain('foreign key (dataset_id, country_id) references wca_countries')
    expect(sql).toContain('foreign key (dataset_id, competition_id) references wca_competitions')
    expect(sql).toContain('wca_competitions_dataset_date_idx')
    expect(sql).toContain('wca_championships_dataset_type_idx')
  })

  it('defines dataset-scoped canonical tables for persons', async () => {
    const sql = await migrationSql('0007_create_wca_person_canonical_tables.sql')

    expect(sql).toContain('create table wca_persons')
    expect(sql).toContain('primary key (dataset_id, id, sub_id)')
    expect(sql).toContain('foreign key (dataset_id, country_id) references wca_countries')
    expect(sql).toContain('wca_persons_dataset_name_idx')
  })

  it('defines dataset-scoped canonical tables for results and attempts', async () => {
    const sql = await migrationSql('0008_create_wca_result_canonical_tables.sql')

    expect(sql).toContain('create table wca_results')
    expect(sql).toContain('create table wca_result_attempts')
    expect(sql).toContain('primary key (dataset_id, id)')
    expect(sql).toContain('primary key (dataset_id, result_id, attempt_number)')
    expect(sql).toContain('foreign key (dataset_id, result_id) references wca_results')
    expect(sql).toContain('wca_results_dataset_competition_event_idx')
  })

  it('defines dataset-scoped canonical tables for ranks', async () => {
    const sql = await migrationSql('0009_create_wca_rank_canonical_tables.sql')

    expect(sql).toContain('create table wca_ranks_single')
    expect(sql).toContain('create table wca_ranks_average')
    expect(sql).toContain('primary key (dataset_id, event_id, world_rank, person_id)')
    expect(sql).toContain('foreign key (dataset_id, event_id) references wca_events')
    expect(sql).toContain('wca_ranks_single_dataset_event_world_idx')
    expect(sql).toContain('wca_ranks_average_dataset_event_world_idx')
  })

  it('defines rank query indexes for regional ranking endpoints', async () => {
    const sql = await migrationSql('0011_add_wca_rank_query_indexes.sql')

    expect(sql).toContain('wca_ranks_single_dataset_event_continent_idx')
    expect(sql).toContain('wca_ranks_single_dataset_event_country_idx')
    expect(sql).toContain('wca_ranks_average_dataset_event_continent_idx')
    expect(sql).toContain('wca_ranks_average_dataset_event_country_idx')
  })

  it('defines person and competition query indexes for public list endpoints', async () => {
    const sql = await migrationSql('0012_add_wca_person_competition_query_indexes.sql')

    expect(sql).toContain('create extension if not exists pg_trgm')
    expect(sql).toContain('wca_persons_name_trgm_idx')
    expect(sql).toContain('wca_persons_id_trgm_idx')
    expect(sql).toContain('wca_competitions_dataset_country_date_idx')
  })

  it('allows rebuilding the same WCA export date safely', async () => {
    const sql = await migrationSql('0013_allow_wca_dataset_export_date_rebuilds.sql')

    expect(sql).toContain('drop constraint if exists wca_dataset_versions_export_date_key')
    expect(sql).toContain('wca_dataset_versions_export_date_idx')
  })

  it('defines staging and canonical scramble tables', async () => {
    const sql = await migrationSql('0014_create_wca_scramble_tables.sql')

    expect(sql).toContain('create table wca_staging_scrambles')
    expect(sql).toContain('create table wca_scrambles')
    expect(sql).toContain('wca_scrambles_dataset_full_filter_idx')
  })

  it('defines staging and canonical championship eligible country tables', async () => {
    const sql = await migrationSql('0015_create_wca_championship_eligible_country_tables.sql')

    expect(sql).toContain('create table wca_staging_eligible_country_iso2s_for_championship')
    expect(sql).toContain('create table wca_championship_eligible_countries')
    expect(sql).toContain('primary key (dataset_id, championship_type, eligible_country_iso2)')
    expect(sql).toContain('wca_championship_eligible_countries_dataset_country_idx')
  })

  it('defines derived count summary tables for large public endpoints', async () => {
    const sql = await migrationSql('0016_create_wca_count_summary_tables.sql')

    expect(sql).toContain('create table wca_result_count_summaries')
    expect(sql).toContain('create table wca_scramble_count_summaries')
    expect(sql).toContain('create table wca_rank_count_summaries')
    expect(sql).toContain("rank_type in ('average', 'single')")
    expect(sql).toContain("region in ('continent', 'country', 'world')")
    expect(sql).toContain('primary key (dataset_id, rank_type, event_id, region, region_id)')
  })
})

function migrationSql(fileName: string): Promise<string> {
  return readFile(join(process.cwd(), 'migrations', fileName), 'utf8')
}
