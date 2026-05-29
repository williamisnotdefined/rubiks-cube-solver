# Frontend Testing

Use this skill when adding or changing `apps/web` Vitest tests, Testing Library tests, React Query hook tests, coverage configuration, or Storybook stories.

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
- Use shared web test helpers under `apps/web/src/test` for React Query providers and fetch mocks.
- Test API request functions and hooks with mocked success and API-error responses.
- Keep core helper tests under `apps/web/src/core/<category>/__tests__`.
- Add or update one Storybook story per component, using controls for prop variation.
- Keep coverage thresholds at 95% or higher when changing coverage configuration.

## Expected Output

- Tests cover user-visible behavior, API hook boundaries, core helpers, and regression paths.
- Tests live in `__tests__/` folders beside the source area they cover.
- Storybook stories live in nearby `stories/` folders and avoid one story per prop.
- Coverage remains at or above 95% for configured web coverage targets.

## Verification

- Run targeted Vitest files first when practical.
- Run `npm run test -w @rubiks-cube-solver/web` after web test changes.
- Run `npm run test:coverage -w @rubiks-cube-solver/web` after coverage or broad frontend changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after story changes.
