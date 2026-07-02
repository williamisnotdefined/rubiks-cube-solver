create table wca_persons (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  sub_id integer not null,
  name text not null,
  country_id text,
  gender text not null,
  primary key (dataset_id, id, sub_id),
  foreign key (dataset_id, country_id) references wca_countries (dataset_id, iso2_code) on delete set null
);

create index wca_persons_dataset_name_idx on wca_persons (dataset_id, name, id, sub_id);
create index wca_persons_dataset_country_idx on wca_persons (dataset_id, country_id, id, sub_id);
