# WCA Data Boundary

Use for the WCA Data workspace, OpenAPI contract, import worker, PostgreSQL lifecycle, or web WCA client.

## Read First

- `ai/rules/wca-data-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/wca-data.md`

## Workflow

- Identify whether the change owns public API, canonical data, import, persistence, worker, or web consumption.
- Preserve contract-first OpenAPI and dataset metadata; keep Axum/Nginx routing aligned around the non-localized 308 docs redirect.
- Use fixture/disposable verification unless a real target was explicitly approved.
- Run WCA build/tests and the relevant web client tests; run public smoke only against an intentional available target.
