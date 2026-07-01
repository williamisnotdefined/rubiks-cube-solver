create table wca_staging_scrambles (
  import_run_id uuid not null references wca_import_runs (id) on delete cascade,
  id bigint,
  competition_id text,
  event_id text,
  round_type_id text,
  group_id text,
  is_extra text,
  scramble_num integer,
  scramble text
);

create table wca_scrambles (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id bigint not null,
  competition_id text not null,
  event_id text not null,
  round_type_id text not null,
  group_id text not null,
  is_extra boolean not null,
  scramble_num integer not null,
  scramble text not null,
  primary key (dataset_id, id),
  foreign key (dataset_id, competition_id) references wca_competitions (dataset_id, id) on delete cascade,
  foreign key (dataset_id, event_id) references wca_events (dataset_id, id) on delete cascade,
  foreign key (dataset_id, round_type_id) references wca_round_types (dataset_id, id) on delete cascade
);

create index wca_staging_scrambles_run_idx on wca_staging_scrambles (import_run_id);
create index wca_scrambles_dataset_competition_idx on wca_scrambles (dataset_id, competition_id, id);
create index wca_scrambles_dataset_event_competition_idx on wca_scrambles (dataset_id, event_id, competition_id, id);
create index wca_scrambles_dataset_full_filter_idx on wca_scrambles (dataset_id, competition_id, event_id, round_type_id, group_id, is_extra, scramble_num, id);
