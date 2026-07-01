create table wca_staging_continents (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  name text not null
);

create table wca_staging_countries (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  name text not null,
  continent_id text,
  iso2 text
);

create table wca_staging_events (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  name text not null,
  rank integer,
  format text
);

create table wca_staging_competitions (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  name text,
  city text,
  country_id text,
  information text,
  year integer,
  month integer,
  day integer,
  end_month integer,
  end_day integer,
  event_specs text,
  wca_delegates text,
  organisers text,
  venue text,
  venue_address text,
  venue_details text,
  external_website text,
  cell_name text,
  latitude text,
  longitude text,
  cancelled text
);

create table wca_staging_persons (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  sub_id integer,
  name text,
  country_id text,
  gender text
);

create table wca_staging_results (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id bigint,
  competition_id text,
  event_id text,
  round_type_id text,
  pos integer,
  best integer,
  average integer,
  person_name text,
  person_id text,
  person_country_id text,
  format_id text,
  regional_single_record text,
  regional_average_record text
);

create table wca_staging_result_attempts (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  result_id bigint,
  attempt_number integer,
  result integer
);

create table wca_staging_ranks_single (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  person_id text,
  event_id text,
  best integer,
  world_rank integer,
  continent_rank integer,
  country_rank integer
);

create table wca_staging_ranks_average (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  person_id text,
  event_id text,
  best integer,
  world_rank integer,
  continent_rank integer,
  country_rank integer
);

create table wca_staging_round_types (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  rank integer,
  name text,
  cell_name text,
  final text
);

create table wca_staging_formats (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id text not null,
  sort_by text,
  sort_by_second text,
  expected_solve_count integer,
  trim_fastest_n integer,
  trim_slowest_n integer,
  name text,
  short_name text
);

create table wca_staging_championships (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id integer,
  competition_id text,
  championship_type text
);

create index wca_staging_continents_run_idx on wca_staging_continents (import_run_id);
create index wca_staging_countries_run_idx on wca_staging_countries (import_run_id);
create index wca_staging_events_run_idx on wca_staging_events (import_run_id);
create index wca_staging_competitions_run_idx on wca_staging_competitions (import_run_id);
create index wca_staging_persons_run_idx on wca_staging_persons (import_run_id);
create index wca_staging_results_run_idx on wca_staging_results (import_run_id);
create index wca_staging_result_attempts_run_idx on wca_staging_result_attempts (import_run_id);
create index wca_staging_ranks_single_run_idx on wca_staging_ranks_single (import_run_id);
create index wca_staging_ranks_average_run_idx on wca_staging_ranks_average (import_run_id);
create index wca_staging_round_types_run_idx on wca_staging_round_types (import_run_id);
create index wca_staging_formats_run_idx on wca_staging_formats (import_run_id);
create index wca_staging_championships_run_idx on wca_staging_championships (import_run_id);
