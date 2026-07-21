---
name: "wca-data-boundary"
description: "Use when changing the WCA Data API, OpenAPI contract, import worker, database lifecycle, or web WCA client."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/wca-data-boundary.md`.

Referenced context:
- `../../../ai/rules/wca-data-rules.md`
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/architecture/wca-data.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: wca-data-boundary

## Canonical Skill: `ai/skills/wca-data-boundary.md`

# WCA Data Boundary

Use for the WCA Data workspace, OpenAPI contract, import worker, PostgreSQL lifecycle, or web WCA client.

## Read First

- `ai/rules/wca-data-rules.md`
- `ai/rules/frontend-rules.md`
- `ai/rules/testing-rules.md`
- `ai/architecture/wca-data.md`

## Workflow

- Identify whether the change owns public API, canonical data, import, persistence, worker, or web consumption.
- Preserve contract-first OpenAPI and dataset metadata; keep Axum/Nginx routing aligned around the non-localized 308 docs redirect.
- Use fixture/disposable verification unless a real target was explicitly approved.
- Run WCA build/tests and the relevant web client tests; run public smoke only against an intentional available target.

# Referenced Context

## Reference: `ai/rules/wca-data-rules.md`

# WCA Data Rules

- Treat `apps/wca-data/openapi/wca-data-v1.yaml` and contract tests as the public API contract.
- Keep import, canonical domain, public API, persistence, and worker concerns separately owned.
- Validate archive size and expected entries; extract only expected TSV files.
- Run local write checks with `npm run wca:sync-once -- --fixture`. Real sync and persistent migrations require explicit target approval.
- Never execute downloaded SQL, expose fixture data in production, or delete published datasets as routine rollback.
- Verify workspace changes with `npm run wca:build` and `npm run wca:test`; use the public smoke command only when the target is intentional and available.

## Reference: `ai/rules/frontend-rules.md`

# Frontend Rules

## Boundaries

- Keep solving, notation semantics, puzzle validity, and replay verification in Rust. React renders and coordinates typed product workflows.
- Keep HTTP mechanics and normalization in `apps/web/src/api`; UI consumes domain hooks/adapters.
- Typed scan-session contracts MAY contain reviewed stickers, confidence, and manual overrides. Notation solve UI MUST NOT expose facelet, Kociemba, or raw cube-state inputs.
- Keep API load, form, page workflow, solve result, scanner review, and visualization playback state separately owned unless a focused page owner coordinates them.
- Use the active `@rubiks-cube-solver/rubiks-cube` package as a visualization adapter, never as canonical solver state.

## Web Runtime And Locales

- Preserve static rendering for indexable routes, `hydrateRoot` for generated markup, and SPA navigation after hydration.
- Keep `en-US` canonical without a prefix. Publish/index any of the nine supported locales only when its visible and SEO content is fully translated with placeholder parity.
- Treat route slugs as stable identifiers. They need not be English and MUST NOT vary by locale; slug changes require redirects and canonical planning.
- Keep route/page code in its bounded context and shared code behind a demonstrated cross-context consumer.

## Existing Patterns

- Prefer local state first, React Query for server state, and existing scoped Zustand stores only for genuinely shared client state.
- Use existing Radix-backed primitives for complex interaction semantics. Use the shared `cn` helper in shadcn-style primitives and established `classnames` as `cls` in feature code when Tailwind conflict resolution is unnecessary.
- React Hook Form and Zod MAY be used when nearby code or form/schema complexity warrants them; they are not mandatory setup.
- New dependencies require the concrete checks in `frontend-quality-rules.md`.

## React Compiler

- `apps/web` uses React 19 with React Compiler enabled through the Vite React compiler preset. Write ordinary components and hooks and let the compiler provide memoization.
- Do not add `useMemo`, `useCallback`, `React.memo`, or other manual render memoization. Do not make referential identity a correctness requirement for effects, subscriptions, or child props.
- Do not use `forwardRef`. React 19 components accept `ref` as a prop; type DOM-forwarding components with `ComponentPropsWithRef` and pass that prop to the owning element. A deliberate non-DOM imperative handle MAY use that prop with `useImperativeHandle`.
- Use `useEffectEvent` when a callback registered by an effect must read the latest props or state without re-subscribing. Keep effect dependencies focused on the values that define the subscription lifecycle.
- Keep derived values and event callbacks as ordinary render-time code. Preserve no legacy memoization solely because it existed before the compiler.
- Do not read from or write to mutable refs during render, except for one-time initialization that React explicitly permits. Put imperative ref synchronization in effects or event handlers.
- Compiler skips unsafe functions rather than changing behavior. Fix Rules of React violations instead of adding blanket opt-outs; use `"use no memo"` only as a short-lived, documented containment for a verified compiler issue.

## Verification

- Run web build, lint, and targeted tests for changed behavior. Web lint runs Biome plus the official React Hooks/Compiler diagnostics and rejects manual memoization imports.
- Treat `npm run build` as the compiler integration check because it exercises both the client bundle and the SSG build.
- Run SSG/SEO and E2E checks when routing, locales, metadata, hydration, scanner, timer, or solve flows change.

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
- Timer keyboard regressions MUST cover navigation into the timer and closing timer controls that normally restore focus, then prove keyboard timing works without manually focusing the timer display.
- Keep web API request and hook tests in the nearest API-domain `__tests__` directory, including the established root, client, and domain-level locations; use shared helpers under `apps/web/src/test`.
- Keep `apps/web/src/core` tests under `apps/web/src/core/<category>/__tests__/<name>.test.ts`.
- Keep global `web` coverage thresholds at 90% for statements, branches, functions, and lines.

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

## Reference: `ai/architecture/wca-data.md`

# WCA Data Architecture

`apps/wca-data` is an independent workspace for unofficial public WCA reference data. It is not part of the Rust solver API.

## Runtime And Ownership

- NestJS with `FastifyAdapter` exposes `/api/wca-data/v1`; PostgreSQL access uses `pg` and SQL migrations.
- A separate `pg-boss` worker schedules import jobs. Import code downloads official TSV exports, stages and transforms rows, then atomically activates a dataset.
- `openapi/wca-data-v1.yaml` is the contract-first API source. Public routes include status/docs/OpenAPI plus championships, competitions, continents, countries, events, formats, persons, rankings, results, round types, scrambles, and top speedcubers.
- List endpoints use `{ data, pagination, meta }`; `meta` identifies the active official export.
- The web app consumes the proxied `/api/wca-data/v1` contract. The Axum app only owns the 308 docs redirect at `/api/wca-data`.

## Safety Boundary

- Official SQL dumps MUST NOT be executed.
- Persistent database migrations, real syncs, and destructive published-data cleanup require explicit approval and confirmed targets.
- Local write verification MUST use fixture mode or a disposable database and temporary storage.
- Production MUST have `WCA_DATA_DATABASE_URL`; fixture fallback is forbidden.
- Rollback SHOULD reactivate a known-good dataset instead of deleting published data.
