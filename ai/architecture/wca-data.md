# WCA Data Architecture

`apps/wca-data` is an independent workspace for unofficial public WCA reference data. It is not part of the Rust solver API.

## Runtime And Ownership

- NestJS with `FastifyAdapter` exposes `/api/wca-data/v1`; PostgreSQL access uses `pg` and SQL migrations.
- A separate `pg-boss` worker schedules import jobs. Import code downloads official TSV exports, stages and transforms rows, then atomically activates a dataset.
- `openapi/wca-data-v1.yaml` is the contract-first API source. Public routes include status/docs/OpenAPI plus championships, competitions, continents, countries, events, formats, persons, rankings, results, round types, scrambles, and top speedcubers.
- List endpoints use `{ data, pagination, meta }`; `meta` identifies the active official export.
- The web app consumes the proxied `/api/wca-data/v1` contract. The Axum app only owns the 308 docs redirect at `/api/wca-data`.

## Safety Boundary

- Official SQL dumps MUST NOT be executed.
- Persistent database migrations, real syncs, and destructive published-data cleanup require explicit approval and confirmed targets.
- Local write verification MUST use fixture mode or a disposable database and temporary storage.
- Production MUST have `WCA_DATA_DATABASE_URL`; fixture fallback is forbidden.
- Rollback SHOULD reactivate a known-good dataset instead of deleting published data.
