# ADR 0008: WCA Data API Service

Status: proposed

## Context

The project needs a public, unofficial WCA data API that exposes competitions, people, rankings, and results from the public World Cube Association Results Export. This data product is separate from the Rust cube solver, the Rust HTTP solver API, the React visualization, and the Python scanner.

The source export is official WCA data, but downloaded SQL must not be executed by this service. The service needs a controlled import path, dataset history, atomic publish behavior, OpenAPI documentation, and a scheduled worker with observability.

## Decision

Create a separate Node/TypeScript workspace at `apps/wca-data`.

Use Fastify for the public HTTP API and keep route handlers thin. Expose the API publicly under `http://speedcube.com.br/api/wca-data/v1` with explicit endpoints for status, events, countries, competitions, persons, rankings, results, and top speedcubers.

Use the WCA public export metadata endpoint as the source of truth for freshness detection. Import the official TSV export into PostgreSQL staging tables, transform it into canonical dataset-scoped tables, and atomically mark a dataset active only after import and transform succeed.

Use `pg-boss` for scheduled imports. The worker is a separate process from the public API and needs locks, retry history, backoff, concurrency control, and observability, which are not provided by crontab alone.

Provide self-hosted API documentation at `http://speedcube.com.br/api/wca-data/v1/docs` and machine-readable specs at `http://speedcube.com.br/api/wca-data/v1/openapi.yaml` and `http://speedcube.com.br/api/wca-data/v1/openapi.json`.

## Consequences

- WCA data code must not depend on or modify solver internals.
- WCA routes are not added to `crates/api`; the Rust API remains the solver boundary.
- The production WCA Data API must use PostgreSQL and must not fall back to fixture data.
- Dataset import and dataset publish are separate operations; failed imports must not replace the active dataset.
- Canonical PostgreSQL tables are the API read model for database-backed operation.
- Downloaded/extracted import artifacts and local storage are runtime artifacts and must not be committed.
- Web docs for `/api/wca-data` must account for routing conflicts with API paths such as `/api/wca-data/v1/status`.

## Alternatives Rejected

- Add WCA routes to `crates/api`: rejected because WCA data serving is a data platform concern, not a solver boundary.
- Import WCA SQL directly: rejected because TSV import avoids executing downloaded SQL and keeps ingestion explicit.
- Use crontab as the primary scheduler: rejected because it lacks structured retries, locks, history, and multi-instance coordination.
- Serve data without dataset versioning: rejected because clients and operators need active dataset identity, freshness metadata, and safe rollback.
