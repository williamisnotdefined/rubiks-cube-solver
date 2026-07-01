create table wca_staging_eligible_country_iso2s_for_championship (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  championship_type text,
  eligible_country_iso2 text
);

create table wca_championship_eligible_countries (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  championship_type text not null,
  eligible_country_iso2 text not null,
  primary key (dataset_id, championship_type, eligible_country_iso2)
);

create index wca_staging_eligible_country_iso2s_for_championship_run_idx
  on wca_staging_eligible_country_iso2s_for_championship (import_run_id);

create index wca_championship_eligible_countries_dataset_country_idx
  on wca_championship_eligible_countries (dataset_id, eligible_country_iso2, championship_type);
