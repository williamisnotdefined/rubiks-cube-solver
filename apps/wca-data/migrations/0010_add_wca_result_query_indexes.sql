create index wca_results_dataset_event_competition_pos_idx
  on wca_results (dataset_id, event_id, competition_id, pos, id)
  where event_id is not null and competition_id is not null;

create index wca_results_dataset_person_event_competition_pos_idx
  on wca_results (dataset_id, person_id, event_id, competition_id, pos, id)
  where event_id is not null and competition_id is not null;
