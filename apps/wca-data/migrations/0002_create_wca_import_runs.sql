create table wca_import_runs (
  id uuid primary key,
  dataset_id uuid references wca_dataset_versions (id) on delete set null,
  reason text not null check (reason in ('schedule', 'manual', 'retry', 'test')),
  status text not null check (status in ('checking', 'skipped', 'running', 'imported', 'built', 'validated', 'published', 'failed')),
  remote_export_date timestamptz,
  remote_export_version text,
  started_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_message text,
  log jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wca_import_runs_created_at_idx on wca_import_runs (created_at desc);
create index wca_import_runs_dataset_id_idx on wca_import_runs (dataset_id);
create index wca_import_runs_remote_export_date_idx on wca_import_runs (remote_export_date desc);
