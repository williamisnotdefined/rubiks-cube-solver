# Frontend API Hook Rules

- Group API code by domain under `apps/web/src/api`; shared HTTP mechanics live under `apps/web/src/api/client`.
- Keep request functions free of React. UI consumes React Query hooks or domain adapters rather than raw requests, query keys, or `fetch`.
- Use queries for cached server state and mutations for user-triggered operations. Keep stable query keys, invalidation, runtime response validation, and normalization inside the API domain.
- Preserve stable API failure payloads as typed results and transport/invalid-JSON failures as errors; never fabricate fallback success metadata.
- Follow the nearest established operation layout instead of imposing a new directory template. Keep tests in that API domain's nearest `__tests__` directory.
- Cancel superseded requests where inputs, scanner frames, routes, or revisions can make a response stale.
