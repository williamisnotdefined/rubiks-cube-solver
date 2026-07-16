# WCA Data Rules

- Treat `apps/wca-data/openapi/wca-data-v1.yaml` and contract tests as the public API contract.
- Keep import, canonical domain, public API, persistence, and worker concerns separately owned.
- Validate archive size and expected entries; extract only expected TSV files.
- Run local write checks with `npm run wca:sync-once -- --fixture`. Real sync and persistent migrations require explicit target approval.
- Never execute downloaded SQL, expose fixture data in production, or delete published datasets as routine rollback.
- Verify workspace changes with `npm run wca:build` and `npm run wca:test`; use the public smoke command only when the target is intentional and available.
