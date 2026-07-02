create table wca_result_count_summaries (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  event_id text not null,
  total integer not null check (total >= 0),
  primary key (dataset_id, event_id)
);

create table wca_scramble_count_summaries (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  event_id text not null,
  total integer not null check (total >= 0),
  primary key (dataset_id, event_id)
);

create table wca_rank_count_summaries (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  rank_type text not null check (rank_type in ('average', 'single')),
  event_id text not null,
  region text not null check (region in ('continent', 'country', 'world')),
  region_id text not null default '',
  total integer not null check (total >= 0),
  primary key (dataset_id, rank_type, event_id, region, region_id)
);

create index wca_rank_count_summaries_dataset_event_idx
  on wca_rank_count_summaries (dataset_id, event_id, rank_type, region, region_id);
