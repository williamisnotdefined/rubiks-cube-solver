alter table wca_dataset_versions
  drop constraint if exists wca_dataset_versions_export_date_key;

create index if not exists wca_dataset_versions_export_date_idx
  on wca_dataset_versions (export_date desc, created_at desc);
