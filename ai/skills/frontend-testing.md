# Frontend Testing

Use this skill when adding or changing `web` Vitest tests, Testing Library tests, React Query hook tests, coverage configuration, or Storybook stories.

## Goal

Protect observable frontend behavior with Vitest, Testing Library, Storybook, and 95% coverage thresholds without coupling tests to implementation details.

## Read First

- `ai/rules/testing-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-api-hook-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Identify the behavior and the narrowest owning test folder before adding tests.
- Add regression tests before fixing bugs when feasible.
- Use Testing Library accessibility queries for React components.
- Use Playwright accessibility queries for E2E flows.
- Use `tests/e2e/select-helpers.ts` for Radix Select controls instead of native `selectOption()` assumptions.
- Use shared web test helpers under `web/src/test` for React Query providers and fetch mocks.
- Test API request functions and hooks with mocked success and API-error responses.
- Keep core helper tests under `web/src/core/<category>/__tests__`.
- Add or update one Storybook story per component, using controls for prop variation.
- Keep coverage thresholds at 95% or higher when changing coverage configuration.

## Expected Output

- Tests cover user-visible behavior, API hook boundaries, core helpers, and regression paths.
- Tests live in `__tests__/` folders beside the source area they cover.
- Storybook stories live in nearby `stories/` folders and avoid one story per prop.
- E2E coverage protects product solve, manual scan, routing, and timer flows when behavior changes.
- Coverage remains at or above 95% for configured web coverage targets.

## Verification

- Run targeted Vitest files first when practical.
- Run `npm run test -w @rubiks-cube-solver/web` after web test changes.
- Run `npm run test:coverage -w @rubiks-cube-solver/web` after coverage or broad frontend changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after story changes.
- Run `npm run test:e2e` after product, timer, scan, or routing behavior changes when prerequisites are available.
- Use `npm run test:e2e:smoke` for a faster product/responsive/timer check, `npm run test:e2e:scan` for manual scan coverage, and `npm run test:e2e:full` for the complete non-heavy gate.
