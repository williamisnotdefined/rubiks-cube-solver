# WCA Data API

Unofficial WCA data service for public reference, competition, person, ranking, result, and scramble data.

This app is intentionally separate from the Rust solver API. The worker imports official WCA TSV exports into canonical PostgreSQL tables and publishes an active dataset version. The public API reads that active dataset and serves typed JSON endpoints at `http://speedcube.com.br/api/wca-data/v1`.

## Hard Stops

- Do not execute downloaded WCA SQL files.
- Do not run migrations against a persistent database without explicit approval for that exact database.
- Do not run a real sync unless it is explicitly approved and the target database/storage are confirmed.
- Use `--fixture` for local write tests.
- Use `--dry-run` for export metadata checks.
- Do not delete published real storage or dataset records automatically.
- Do not deploy, commit, push, or alter dependency directory permissions as part of routine local verification.
- Do not run the production API without `WCA_DATA_DATABASE_URL`; production must never fall back to fixture data.

## Safe Local Commands

From the repository root:

```bash
npm run wca:build
npm run wca:test
npm run wca:sync-once -- --fixture
npm run wca:smoke:public -- --max-ms 10000
```

The fixture sync uses bundled TSV files and in-memory repositories. It does not require network access or PostgreSQL.

## Dry Run

Use dry run to inspect export metadata without writing data:

```bash
npm run wca:sync-once -- --dry-run
```

Dry run may contact the configured WCA export metadata URL. It does not download the TSV archive, write import artifacts, run migrations, or publish a dataset.

## Real TSV Import Notes

The importer supports the current WCA export v2 snake_case TSV filenames and the legacy fixture filenames used by local tests. Supported canonical data currently includes championships, championship eligible countries, competitions, continents, countries, events, formats, persons, rankings, result attempts, results, round types, and scrambles.

Downloads retry transient HTTP `429` and `5xx` responses. If the WCA TSV endpoint continues returning an HTTP error after retries, treat it as an external blocker and rerun later with the same disposable database/storage checks.

For a real import test, use only disposable PostgreSQL and temporary storage unless an exact persistent target has been approved:

```bash
WCA_DATA_DATABASE_URL=postgres://... \
WCA_DATA_STORAGE_DIR=/tmp/wca-data-real \
npm run wca:sync-once -- --force
```

When the official WCA download endpoint is unavailable but an official TSV ZIP has already been obtained, use `--source-zip` instead of downloading during the sync:

```bash
WCA_DATA_DATABASE_URL=postgres://... \
WCA_DATA_STORAGE_DIR=/tmp/wca-data-real \
npm run wca:sync-once -- --source-zip /path/to/WCA_export_v2_181_20260630T000016Z.tsv.zip --force
```

`--source-zip` reads `metadata.json` from the archive, extracts only expected files, loads TSV rows into staging, transforms canonical tables, and publishes the dataset. It is a supported operational path, not a fixture mode.

Expected validation after a real import:

- migrations run from scratch and are idempotent on a second run
- TSV archive downloads, validates size, and extracts safely
- staging COPY loads all supported TSV files
- canonical transform and dataset activation complete atomically
- canonical table statistics are refreshed after transform
- `http://speedcube.com.br/api/wca-data/v1/status` reports `ok` with the active dataset
- list endpoints return `{ data, pagination, meta }`

## Database Setup

PostgreSQL is only required for real import/publish operation and the worker runtime.

Required before using a database:

- Confirm the database is disposable, test-only, or explicitly approved.
- Confirm `WCA_DATA_DATABASE_URL` points at the intended database.
- Confirm `WCA_DATA_STORAGE_DIR` points at the intended storage root.
- Run migrations only after those checks.

Migration command from this workspace:

```bash
npm run db:migrate -w @rubiks-cube-solver/wca-data
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `WCA_DATA_HOST` | `127.0.0.1` | API bind host. Production uses `0.0.0.0` inside Docker. |
| `WCA_DATA_PORT` | `8796` | API bind port. |
| `WCA_DATA_PUBLIC_BASE_URL` | `http://speedcube.com.br/api` | Public base URL for docs and runtime metadata. |
| `WCA_DATA_STORAGE_DIR` | `storage/wca-data` | Root for downloaded/extracted import artifacts. |
| `WCA_DATA_DATABASE_URL` | unset | Enables PostgreSQL-backed operation when set. |
| `WCA_DATA_DATABASE_SSL_MODE` | `disable` | Set to `require` when the database requires SSL. |
| `WCA_DATA_PG_BOSS_SCHEMA` | `wca_jobs` | PostgreSQL schema used by `pg-boss`. |
| `WCA_DATA_SYNC_ENABLED` | `true` | Enables scheduled worker jobs. Disable for first production rollout. |
| `WCA_DATA_SYNC_CRON` | `30 4 * * *` | Worker schedule. |
| `WCA_DATA_SYNC_TIMEZONE` | `UTC` | Worker schedule timezone. |
| `WCA_DATA_WCA_EXPORT_METADATA_URL` | WCA public export endpoint | Metadata endpoint used by dry run and real sync. |
| `WCA_DATA_LOG_LEVEL` | `info` | Runtime log level. |

## Storage Layout

Temporary import artifacts live under:

```text
imports/<importRunId>/
```

Cleanup is limited to `imports/<importRunId>`. Published dataset records are not deleted automatically.

## Worker

The worker uses `pg-boss` for queueing, retries, singleton policy, and scheduling. It is a separate process from the public API.

Local worker command:

```bash
npm run dev:worker -w @rubiks-cube-solver/wca-data
```

Production initial sync command after migrations and before expecting public data:

```bash
docker compose --profile manual run --rm wca-data-sync-once
```

This command downloads the official WCA TSV export and publishes the active dataset in the configured PostgreSQL database. If the official WCA TSV endpoint is unavailable, the command fails and the public API remains without a new active dataset rather than serving fixture data.

Production local-ZIP sync command when an official ZIP is mounted into the container:

```bash
docker compose -p rubiks-prod --profile manual run --rm \
  -v "/home/wozzp/Documents:/imports:ro" \
  wca-data-sync-once npm run sync:once -- \
  --source-zip "/imports/WCA_export_v2_181_20260630T000016Z.tsv.zip" \
  --force
```

Production rollout recommendation:

- Start with `WCA_DATA_SYNC_ENABLED=false`.
- Verify API health and status routes.
- Verify migrations and storage against the intended environment.
- Run fixture sync only if a local temporary storage path is configured.
- Enable the schedule only after a manual real sync is explicitly approved.

## API Routes

- `GET http://speedcube.com.br/api/wca-data/v1/status`
- `GET http://speedcube.com.br/api/wca-data/v1/openapi.yaml`
- `GET http://speedcube.com.br/api/wca-data/v1/openapi.json`
- `GET http://speedcube.com.br/api/wca-data/v1/docs`
- `GET http://speedcube.com.br/api/wca-data/v1/championship-eligible-countries`
- `GET http://speedcube.com.br/api/wca-data/v1/championships`
- `GET http://speedcube.com.br/api/wca-data/v1/continents`
- `GET http://speedcube.com.br/api/wca-data/v1/events`
- `GET http://speedcube.com.br/api/wca-data/v1/formats`
- `GET http://speedcube.com.br/api/wca-data/v1/countries`
- `GET http://speedcube.com.br/api/wca-data/v1/competitions`
- `GET http://speedcube.com.br/api/wca-data/v1/competitions/:id`
- `GET http://speedcube.com.br/api/wca-data/v1/persons`
- `GET http://speedcube.com.br/api/wca-data/v1/persons/:id`
- `GET http://speedcube.com.br/api/wca-data/v1/rankings`
- `GET http://speedcube.com.br/api/wca-data/v1/results`
- `GET http://speedcube.com.br/api/wca-data/v1/round-types`
- `GET http://speedcube.com.br/api/wca-data/v1/scrambles`
- `GET http://speedcube.com.br/api/wca-data/v1/speedcubers/top`

List endpoints use this envelope:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 50, "total": 0, "hasNextPage": false },
  "meta": {
    "datasetId": "...",
    "exportDate": "...",
    "exportVersion": "...",
    "source": "World Cube Association Results Export"
  }
}
```

Common filters:

- `/competitions`: `countryIso2`, `eventId`, `year`, `page`, `pageSize`
- `/championship-eligible-countries`: `championshipType`, `countryIso2`, `page`, `pageSize`
- `/persons`: `countryIso2`, `search`, `page`, `pageSize`
- `/rankings`: `eventId`, `type`, `region`, `countryIso2`, `continentId`, `page`, `pageSize`
- `/results`: `competitionId`, `eventId`, `personId`, `page`, `pageSize`
- `/scrambles`: `competitionId`, `eventId`, `roundTypeId`, `groupId`, `isExtra`, `page`, `pageSize`

## Production Deploy Notes

The WCA Data API, worker, migrate job, and manual sync image are built from `Dockerfile.wca-data` and run through the `rubiks-prod` Compose project. Production requires `WCA_DATA_POSTGRES_PASSWORD` for Compose interpolation and `WCA_DATA_DATABASE_URL` inside WCA Data containers.

Apply WCA Data image changes without pulling Git or touching unrelated app services:

```bash
docker compose -p rubiks-prod build wca-data-migrate wca-data-api wca-data-worker wca-data-sync-once
docker compose -p rubiks-prod run --rm wca-data-migrate
docker compose -p rubiks-prod up -d --no-deps --force-recreate wca-data-api wca-data-worker
node scripts/runtime/wait-url.mjs wca-data-api http://127.0.0.1:8796/health 120000
```

After a large manual import, public performance should be verified with the smoke script. The transformer runs `ANALYZE` automatically after future imports; if an already-published dataset predates that code path, run a one-off PostgreSQL `ANALYZE` before judging query latency.

## Rollback

Rollback should prefer switching the active dataset record back to the previous known-good dataset.

Do not remove published dataset records during rollback unless cleanup of a specific dataset is explicitly approved.

## Verification Gate

Before considering a change ready:

```bash
npm run wca:build
npm run wca:test
npm run wca:sync-once -- --fixture
WCA_DATA_POSTGRES_PASSWORD=placeholder docker compose config --quiet
WCA_DATA_POSTGRES_PASSWORD=placeholder docker compose --profile manual config --quiet
npm run wca:smoke:public -- --max-ms 10000
git diff --check
```

For frontend documentation changes, also run the web build/lint once dependency tooling is healthy.
