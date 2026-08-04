create table wca_worker_heartbeats (
  worker_name text primary key,
  heartbeat_at timestamptz not null
);
