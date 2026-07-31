# WCA Data Rules

- Treat `apps/wca-data/openapi/wca-data-v1.yaml` and contract tests as the public API contract.
- Keep import, canonical domain, public API, persistence, and worker concerns separately owned.
- Validate archive size and expected entries; extract only expected TSV files.
- Run local write checks with `npm run wca:sync-once -- --fixture`. Real sync and persistent migrations require explicit target approval.
- Never execute downloaded SQL or expose fixture data in production. A successful production import retains only the active dataset; retired and failed datasets are removed after atomic publication, so rollback requires a backup or fresh verified import.
- Verify workspace changes with `npm run wca:build` and `npm run wca:test`; use the public smoke command only when the target is intentional and available.
