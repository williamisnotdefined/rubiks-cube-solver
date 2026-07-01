create table wca_results (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id bigint not null,
  competition_id text,
  event_id text,
  round_type_id text,
  pos integer not null,
  best integer not null,
  average integer not null,
  person_name text not null,
  person_id text not null,
  person_country_id text,
  format_id text,
  regional_single_record text not null,
  regional_average_record text not null,
  primary key (dataset_id, id),
  foreign key (dataset_id, competition_id) references wca_competitions (dataset_id, id) on delete set null,
  foreign key (dataset_id, event_id) references wca_events (dataset_id, id) on delete set null,
  foreign key (dataset_id, round_type_id) references wca_round_types (dataset_id, id) on delete set null,
  foreign key (dataset_id, format_id) references wca_formats (dataset_id, id) on delete set null
);

create table wca_result_attempts (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  result_id bigint not null,
  attempt_number integer not null,
  result integer not null,
  primary key (dataset_id, result_id, attempt_number),
  foreign key (dataset_id, result_id) references wca_results (dataset_id, id) on delete cascade
);

create index wca_results_dataset_competition_event_idx on wca_results (dataset_id, competition_id, event_id, pos, id);
create index wca_result_attempts_dataset_result_idx on wca_result_attempts (dataset_id, result_id, attempt_number);
