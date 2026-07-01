create extension if not exists pg_trgm;

create index wca_persons_name_trgm_idx
  on wca_persons using gin (lower(name) gin_trgm_ops)
  where sub_id = 1;

create index wca_persons_id_trgm_idx
  on wca_persons using gin (lower(id) gin_trgm_ops)
  where sub_id = 1;

create index wca_competitions_dataset_country_date_idx
  on wca_competitions (dataset_id, country_id, year desc, month desc, day desc, id);
