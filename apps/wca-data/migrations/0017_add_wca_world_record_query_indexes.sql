create index if not exists wca_ranks_single_dataset_event_world_idx
  on wca_ranks_single (dataset_id, event_id, world_rank, person_id);

create index if not exists wca_ranks_average_dataset_event_world_idx
  on wca_ranks_average (dataset_id, event_id, world_rank, person_id);

create index if not exists wca_results_dataset_person_event_best_idx
  on wca_results (dataset_id, person_id, event_id, best, id)
  where person_id is not null and event_id is not null;

create index if not exists wca_results_dataset_person_event_average_idx
  on wca_results (dataset_id, person_id, event_id, average, id)
  where person_id is not null and event_id is not null;
