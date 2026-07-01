create table wca_ranks_single (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  person_id text not null,
  event_id text not null,
  best integer not null,
  world_rank integer not null,
  continent_rank integer not null,
  country_rank integer not null,
  primary key (dataset_id, event_id, world_rank, person_id),
  foreign key (dataset_id, event_id) references wca_events (dataset_id, id) on delete cascade
);

create table wca_ranks_average (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  person_id text not null,
  event_id text not null,
  best integer not null,
  world_rank integer not null,
  continent_rank integer not null,
  country_rank integer not null,
  primary key (dataset_id, event_id, world_rank, person_id),
  foreign key (dataset_id, event_id) references wca_events (dataset_id, id) on delete cascade
);

create index wca_ranks_single_dataset_event_world_idx on wca_ranks_single (dataset_id, event_id, world_rank, person_id);
create index wca_ranks_average_dataset_event_world_idx on wca_ranks_average (dataset_id, event_id, world_rank, person_id);
