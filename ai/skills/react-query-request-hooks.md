# React Query Request Hooks

Use for web request functions, runtime response validation, query/mutation hooks, and query keys.

## Read First

- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Follow the owning API domain's current layout and keep transport code under `src/api/client`.
- Preserve typed API failures, transport errors, cancellation, and cache ownership.
- Expose hooks/adapters to UI, not raw requests or query keys.
- Add tests in the nearest API-domain `__tests__`, then run targeted tests and web build.
