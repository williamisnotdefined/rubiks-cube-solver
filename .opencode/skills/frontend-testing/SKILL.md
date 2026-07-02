---
name: "frontend-testing"
description: "Use when adding or changing web Vitest tests, Testing Library tests, React Query hook tests, coverage configuration, or Storybook stories."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-testing.md`.

Referenced context:
- `../../../ai/rules/testing-rules.md`
- `../../../ai/rules/frontend-component-rules.md`
- `../../../ai/rules/frontend-api-hook-rules.md`
- `../../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-testing

## Canonical Skill: `ai/skills/frontend-testing.md`

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
- Use Playwright accessibility queries for E2E flows.
- Use `tests/e2e/select-helpers.ts` for Radix Select controls instead of native `selectOption()` assumptions.
- Use shared web test helpers under `apps/web/src/test` for React Query providers and fetch mocks.
- Test API request functions and hooks with mocked success and API-error responses.
- Keep core helper tests under `apps/web/src/core/<category>/__tests__`.
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

# Referenced Context

## Reference: `ai/rules/testing-rules.md`

# Testing Rules

Testing rules for this repository.

## Always

- Add Rust unit tests next to pure functions when behavior is introduced.
- Add integration tests under the owning crate when behavior crosses module boundaries.
- Add regression tests next to changed behavior when fixing bugs.
- Test observable cube behavior: solved state, inverse moves, notation parsing, scramble inversion, validation, and search output.
- Test HTTP/API behavior through request and response contracts when `crates/api` behavior changes.
- Test web API-client and UI behavior through public component or request boundaries when frontend behavior changes.
- Test scanner training code with deterministic fixtures or fixed seeds.
- Keep algorithm tests deterministic.
- Run the narrowest test first, then the affected crate test command.
- Use Vitest APIs such as `describe`, `it`, `expect`, `vi.fn`, and `vi.spyOn` for `web` unit and component tests.
- Keep `web` tests in `__tests__/` folders beside the source area they cover.
- Use Testing Library for React component behavior and public accessibility queries.
- Use Playwright accessibility queries for E2E flows and shared E2E helpers for non-native controls such as Radix Select.
- Keep `apps/web/src/api` request and hook tests in `apps/web/src/api/__tests__`, using shared fetch and React Query helpers under `apps/web/src/test`.
- Keep `apps/web/src/core` tests under `apps/web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep `web` coverage thresholds at 95% or higher for statements, branches, functions, and lines when coverage is configured.

## Never

- Do not rely on random tests without a fixed seed.
- Do not assert implementation details when public cube behavior can be asserted.
- Do not leave focused-only tests such as `.only` in committed test files.
- Do not add duplicate test helpers when nearby crate, web, API, or scanner helpers already cover the setup.
- Do not add tests for future surfaces that do not exist yet.
- Do not use Jest-only APIs or `jest.mock` patterns in Vitest tests.
- Do not place `web` tests as loose sibling `*.test.ts(x)` files when a nearby `__tests__/` folder is available.
- Do not add duplicate web test helpers when `apps/web/src/test/render.tsx` or `apps/web/src/test/api.ts` already covers the setup.
- Do not use Playwright `selectOption()` or `locator('option')` for Radix Select controls; use helpers under `tests/e2e/select-helpers.ts`.

## Verification

- Cube engine tests: `cargo test -p cube-engine`.
- API tests: `npm run api:test` or `cargo test -p rubiks-cube-solver-api`.
- Workspace tests: `cargo test`.
- Web build/lint: `npm run build` and `npm run lint -w @rubiks-cube-solver/web`.
- Web unit tests: `npm run test -w @rubiks-cube-solver/web`.
- Web coverage: `npm run test:coverage -w @rubiks-cube-solver/web`.
- Web Storybook: `npm run storybook:build -w @rubiks-cube-solver/web`.
- End-to-end tests: `npm run test:e2e` after the API, web app, and pruning-table prerequisites are available.
- E2E split commands: `npm run test:e2e:smoke` for product/responsive/timer smoke, `npm run test:e2e:scan` for serial manual scan coverage, and `npm run test:e2e:full` for the complete non-heavy suite.
- Product gate: `npm run product:gate` for release-level or cross-boundary validation.
- AI routes: `npm run ai:check`.

## Reference: `ai/rules/frontend-component-rules.md`

# Frontend Component Rules

Rules for React component boundaries in `apps/web`.

## Always

- Keep route or screen files readable as composition.
- Keep frontend route paths and URL segments in English stable slugs; translate menu labels, headings, and copy through `react-i18next` locale files under `apps/web/src/i18n/locales` instead of localizing URLs.
- When adding or changing translation keys, update every supported locale file: `en`, `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh` for Simplified Chinese, and `ja`, preserving interpolation placeholders.
- Extract components when UI repeats or a named component clarifies ownership, state boundaries, or screen structure.
- Keep one-off UI inline when extraction only adds indirection.
- Keep page-level screens under `apps/web/src/pages`.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `apps/web/src/components` only after there is a real shared consumer.
- Keep visualization-specific components and hooks near the owning visualization feature unless reused.
- Keep context-independent helpers in focused `apps/web/src/core/<category>/<name>.ts` files, not inside React components.
- Import core helpers from direct file paths; do not add `src/core` barrels.
- Keep React component props explicit and small.
- Prefer `children` for layout wrappers such as panels, shells, and result regions.
- Use `lucide-react` for UI icons; import icon components directly from `lucide-react` instead of authoring local SVG icons.
- Use shared shadcn/Radix-backed primitives directly under `apps/web/src/components` for new admin-style UI, including `Dialog`, `AlertDialog`, `Sheet`, `Select`, `Switch`, `Checkbox`, `DropdownMenu`, `Toast`/`Toaster`, `Popover`, `Tooltip`, `Tabs`, `Table`, and `Sidebar`, so portal, focus, escape, and outside-click behavior stay consistent.
- Extract focused hooks for repeated or stateful UI behavior, but do not hide an oversized component in a single oversized hook.
- Keep new or substantially changed React component files at or below 400 lines where practical.
- Keep Storybook stories in a `stories/` child folder beside the source area they cover.
- Use one primary story export per component and expose prop variation through controls instead of one story per prop.

## Never

- Do not turn every extraction into a broad component library.
- Do not move page, cube, solver, API, or visualization-specific helpers into shared utilities before reuse exists.
- Do not let `App.tsx`, page files, or hooks become god modules.
- Do not add localized route paths; user-visible navigation text belongs in locale files.
- Do not use nested ternary expressions in React or frontend helpers; use explicit `if`/`return`, a named helper, or a small lookup table instead.
- Do not fix a god component by moving all state and effects into a god provider or god hook.
- Do not create React Context for mutable UI state.
- Do not render short fixed control groups through artificial arrays when direct JSX is clearer.
- Do not mix cube validation, search, or solver behavior into React components.
- Do not write inline `<svg>` icons, local `*Icon` components, or custom icon path data in React components; choose the closest `lucide-react` icon instead.
- Do not hand-roll dialog, select, switch, checkbox, toast, popover/dropdown state, document outside-click listeners, focus handling, or portal positioning when a shared primitive can represent the behavior.
- Do not import Radix packages directly outside the corresponding wrapper under `apps/web/src/components` unless a new shared primitive is being created.
- Do not place component stories in a shared fixtures folder; reserve shared story data for `src/stories` if it exists.

## Data-Driven Rendering

- Use arrays and `.map()` for API data, dynamic collections, long repeated groups, or lists whose members are not all known at author time.
- Render items directly when the UI is a short fixed set of product controls.

## Verification

- Ensure extracted components do not change user-visible behavior.
- Run `npm run build` after TypeScript or React component moves.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Search changed frontend files for inline `<svg>`, local `*Icon` components, custom icon path data, and direct Radix package imports outside `apps/web/src/components` wrappers before finishing.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after adding or changing stories.

## Reference: `ai/rules/frontend-api-hook-rules.md`

# Frontend API Hook Rules

Rules for React Query API operations in `apps/web/src/api`.

## Always

- Group frontend API code by domain under `apps/web/src/api`.
- Keep shared HTTP details in `apps/web/src/api/client.ts`, including base URL resolution, JSON headers, request helpers, and transport error mapping.
- Split every operation into a raw request function, a React Query hook, and an operation `index.ts` when the operation is consumed by UI.
- Keep request functions free of React imports.
- Use `useQuery` for cached server state such as API health and strategy metadata.
- Use `useMutation` for solve requests and other user-triggered operations.
- Keep query keys stable in a domain-level `queryKeys.ts` when hooks share a domain.
- Use `enabled` in query hooks when prerequisite API state or inputs are unavailable.
- Keep mutation cache invalidation inside mutation hooks when a mutation makes cached server state stale.
- Keep operation-specific response normalization beside the operation that needs it.
- Preserve domain-level API failures such as invalid notation or generated-table errors as typed normalized results when the API returns a stable response payload.
- Let transport errors and invalid HTTP JSON failures surface through React Query error state instead of fabricating solver metadata.
- Use explicit named exports in operation and domain barrels.

## Never

- Do not call raw request functions from React components.
- Do not expose request functions from barrels consumed by UI components.
- Do not import query keys into components.
- Do not call `fetch` directly outside `apps/web/src/api/client.ts` unless the request is intentionally outside the app API contract.
- Do not duplicate API status parsing or solve response normalization inside React components.
- Do not create fake fallback solve metadata for transport errors.
- Do not use React Query as the canonical solver state; the Rust API and engine remain authoritative.
- Do not manually synchronize server results in components after mutations when React Query invalidation belongs in the hook.

## Layout

- Request file: `apps/web/src/api/<domain>/<operation>/<operation>.ts`.
- Hook file: `apps/web/src/api/<domain>/<operation>/use<Operation>.ts`.
- Operation barrel: `apps/web/src/api/<domain>/<operation>/index.ts`.
- Domain barrel: `apps/web/src/api/<domain>/index.ts`.
- Query keys: `apps/web/src/api/<domain>/queryKeys.ts`.
- Domain types: `apps/web/src/api/<domain>/types.ts` when multiple operations share API types.

## Verification

- Search changed components for raw request function, `fetch`, or query-key imports.
- Test request functions and React Query hooks with mocked successful responses and mocked API errors when API behavior changes.
- Run `npm run build` after API-client or hook changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders solver interaction, scan workflows, notation pages, algorithms pages, timer flows, and visualization playback. It must not become the source of truth for puzzle logic.

## Boundary

- The Rust HTTP API and `cube-engine` own solver behavior, puzzle validation, search, heuristics, and replay verification.
- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- React components own user interaction, form controls, loading indicators, result display, visualization playback, and local UI state.
- `@rubiks-cube-solver/rubiks-cube` is a private visualization package and adapter surface, not the solver core.
- Facelet, Kociemba, sticker-state, and visual-state strings are adapter details. UI copy should speak in puzzles, moves, limits, strategies, scanner review, and solver statuses.

## Data Flow

```txt
React page/component
        -> apps/web/src/api request or React Query hook
        -> Rust HTTP API
        -> cube-engine solve or scan contract
        -> normalized API result
        -> visualization adapter / playback UI
```

API load state, solve result state, form state, scan workflow state, and visualization playback state should remain separately owned unless a focused page-level owner explicitly coordinates them.

## Visualization State

- Supported visual-state kinds come from API and puzzle contracts, such as `cube3-facelets-v1`, `cube2-facelets-v1`, or `none`.
- Visualization hooks may parse supported move tokens to animate or set renderer state, but Rust remains authoritative for notation semantics and puzzle validity.
- Imperative custom-element synchronization belongs in focused visualization hooks and refs, not broad page effects.
- Selection and playback state should be represented by IDs, move indexes, notation strings, or small status values instead of duplicated puzzle objects when possible.
- The visible cube should remain within the established 350px by 350px UI constraint unless the design is intentionally changed.

## Current Frontend Stack

- Vite, React, TypeScript, React Router, React Query, React Hook Form, Zod, Zustand, Tailwind CSS v4, shadcn/Radix-backed shared primitives, `cn` class merging, `react-i18next`, Motion, Vitest, Storybook, and Playwright are the current frontend stack.
- Additional global state, routing, form, animation, styling, or component dependencies should wait until the existing stack cannot satisfy a concrete current need.
