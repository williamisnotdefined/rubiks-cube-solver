create index wca_ranks_single_dataset_event_continent_idx
  on wca_ranks_single (dataset_id, event_id, continent_rank, person_id);

create index wca_ranks_single_dataset_event_country_idx
  on wca_ranks_single (dataset_id, event_id, country_rank, person_id);

create index wca_ranks_average_dataset_event_continent_idx
  on wca_ranks_average (dataset_id, event_id, continent_rank, person_id);

create index wca_ranks_average_dataset_event_country_idx
  on wca_ranks_average (dataset_id, event_id, country_rank, person_id);
