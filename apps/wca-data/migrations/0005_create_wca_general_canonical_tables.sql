create table wca_continents (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  name text not null,
  sort_order integer not null,
  primary key (dataset_id, id)
);

create table wca_countries (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  iso2_code text not null,
  name text not null,
  continent_id text,
  primary key (dataset_id, id),
  unique (dataset_id, iso2_code),
  foreign key (dataset_id, continent_id) references wca_continents (dataset_id, id) on delete set null
);

create table wca_events (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  name text not null,
  rank integer,
  format text not null check (format in ('time', 'number', 'multi')),
  primary key (dataset_id, id)
);

create table wca_round_types (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  rank integer,
  name text not null,
  cell_name text not null,
  is_final boolean not null,
  primary key (dataset_id, id)
);

create table wca_formats (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  sort_by text not null,
  sort_by_second text not null,
  expected_solve_count integer not null,
  trim_fastest_n integer not null,
  trim_slowest_n integer not null,
  name text not null,
  short_name text not null,
  primary key (dataset_id, id)
);

create index wca_continents_dataset_sort_idx on wca_continents (dataset_id, sort_order, id);
create index wca_countries_dataset_name_idx on wca_countries (dataset_id, name, iso2_code, id);
create index wca_events_dataset_rank_idx on wca_events (dataset_id, rank nulls last, id);
create index wca_round_types_dataset_rank_idx on wca_round_types (dataset_id, rank nulls last, id);
create index wca_formats_dataset_name_idx on wca_formats (dataset_id, name, id);
