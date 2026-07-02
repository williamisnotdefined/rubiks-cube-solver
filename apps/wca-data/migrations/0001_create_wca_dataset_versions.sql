create table wca_dataset_versions (
  id uuid primary key,
  export_date timestamptz not null unique,
  export_version text not null,
  export_format_version text,
  source_tsv_url text,
  source_tsv_filesize_bytes bigint,
  source_sql_url text,
  source_sql_filesize_bytes bigint,
  source_readme text,
  status text not null check (status in ('building', 'validating', 'ready', 'active', 'failed', 'retired')),
  is_active boolean not null default false,
  document_count integer not null default 0 check (document_count >= 0),
  total_bytes bigint not null default 0 check (total_bytes >= 0),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index wca_dataset_versions_one_active_idx
  on wca_dataset_versions (is_active)
  where is_active = true;

create index wca_dataset_versions_active_published_idx
  on wca_dataset_versions (published_at desc)
  where status = 'active';
