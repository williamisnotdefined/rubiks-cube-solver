create table wca_competitions (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id text not null,
  name text not null,
  city text not null,
  country_id text,
  information text not null,
  year integer not null,
  month integer not null,
  day integer not null,
  end_month integer not null,
  end_day integer not null,
  event_specs text not null,
  wca_delegates text not null,
  organisers text not null,
  venue text not null,
  venue_address text not null,
  venue_details text not null,
  external_website text not null,
  cell_name text not null,
  latitude text not null,
  longitude text not null,
  cancelled boolean not null,
  primary key (dataset_id, id),
  foreign key (dataset_id, country_id) references wca_countries (dataset_id, iso2_code) on delete set null
);

create table wca_championships (
  dataset_id uuid not null references wca_dataset_versions (id) on delete cascade,
  id integer not null,
  competition_id text,
  championship_type text not null,
  primary key (dataset_id, id),
  foreign key (dataset_id, competition_id) references wca_competitions (dataset_id, id) on delete set null
);

create index wca_competitions_dataset_date_idx on wca_competitions (dataset_id, year desc, month desc, day desc, id);
create index wca_competitions_dataset_country_idx on wca_competitions (dataset_id, country_id, id);
create index wca_championships_dataset_type_idx on wca_championships (dataset_id, championship_type, id);
