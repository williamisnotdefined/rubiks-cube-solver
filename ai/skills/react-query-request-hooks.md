# React Query Request Hooks

Use this skill when adding or changing `web` API query hooks, mutation hooks, request functions, query keys, or response normalization.

## Goal

Keep React Query as the frontend server-state boundary while keeping raw HTTP details and API normalization out of React components.

## Read First

- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Identify the API domain and operation name from nearby operations.
- Add or update the request function, hook, operation barrel, domain barrel, and domain query keys as needed.
- Keep request functions private to the API layer and free of React imports.
- Keep domain-specific response normalization beside the operation that needs it.
- Use query hooks for API state that should be cached and mutation hooks for user-triggered solve requests.
- Put cache invalidation in mutation hooks when mutations make cached API state stale.
- Keep transport errors in React Query error state and stable API failure statuses in typed normalized results.
- Update components to consume domain hooks only.

## Expected Output

- UI-facing barrels export hooks, not raw request functions.
- Components do not import `fetch`, raw requests, or query keys.
- Request details stay behind `web/src/api/client.ts`.
- Solve response status parsing stays in `web/src/api`, not page components.
- Browser clients still submit move notation and limits, never facelets or sticker state.
- Request functions and hooks have Vitest coverage for success, API failure payloads, disabled queries, and mutation behavior when changed.

## Verification

- Search changed components for direct `fetch`, raw request function, or query-key usage.
- Run `npm run build` after API-client or hook changes.
- Run `npm run test -w @rubiks-cube-solver/web` after changing request functions or hooks.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run relevant E2E tests for solve flow behavior.
