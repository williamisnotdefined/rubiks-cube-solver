---
name: "frontend-testing"
description: "Use when changing web unit/component/API tests, coverage, Storybook, or Playwright E2E."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-testing.md`.

Referenced context:
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/rules/testing-rules.md`
- `../../../ai/rules/frontend-quality-rules.md`
- `../../../ai/architecture/web-architecture.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-testing

## Canonical Skill: `ai/skills/frontend-testing.md`

# Frontend Testing

Use for Vitest, Testing Library, API-domain tests, coverage, Storybook, and Playwright E2E.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/web-architecture.md`

## Workflow

- Test observable behavior at the narrowest public boundary and place it in the nearest established `__tests__` folder.
- Use accessible queries and shared API/E2E helpers; cover cancellation and recoverable failures where relevant.
- Keep global statements, branches, functions, and lines thresholds at 90%.
- Run the targeted test first, then coverage, Storybook, or the relevant E2E split for the changed surface.

# Referenced Context

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

## Reference: `ai/rules/frontend-quality-rules.md`

# Frontend Quality Rules

Focused requirements for accessibility, performance, security, resilience, and dependencies in `apps/web`.

## Accessibility

- Interactive controls MUST have an accessible name, keyboard operation, visible focus, and correct native element or shared primitive semantics.
- Dialogs and sheets MUST preserve focus trapping, Escape handling, focus return, and labelled title/description behavior through existing primitives.
- Dynamic errors and completion states SHOULD use an appropriate live/status region without repeatedly announcing scanner frame updates.
- Motion MUST respect reduced-motion preferences; color MUST NOT be the only signal for scan, validation, timer, or solver status.

## Performance

- Indexable routes MUST retain SSG output and hydration; do not replace server-rendered content with client-only placeholders.
- Heavy visualization, algorithm, and page code SHOULD remain route- or feature-split. Avoid importing broad package barrels when a supported subpath exists.
- Supported Solver and Notation puzzle stages MUST automatically request their renderer. Solver visualizations MUST load no later than three seconds after mount; Notation visualizations MUST load automatically after their stage approaches the viewport. Clicking a preparing state MAY accelerate loading or retry an error, but MUST NEVER be required to see a visualization. Performance work MUST NOT defer any supported visualization behind an explicit click; tests MUST prove automatic loading for Solver and every supported Notation puzzle.
- Camera analysis MUST cancel stale work and avoid overlapping unbounded requests. Versioned assets remain immutable; mutable HTML and metadata MUST NOT receive immutable caching.
- Performance changes MUST use a concrete signal such as bundle output, request count, render behavior, or measured interaction, not speculative memoization.

## Security And Resilience

- Camera permission MUST follow a clear disclosure of purpose and processing. Once permission succeeds, scanner analysis starts automatically by default; users retain pause/exit and manual-review controls.
- Images and reviewed scan data MUST stay within typed scan contracts and configured request limits. Do not persist or transmit camera data beyond the disclosed solve workflow.
- Browser code MUST not weaken CSP, permissions policy, origin restrictions, request size limits, runtime response validation, or typed error handling.
- Async work MUST handle cancellation and stale responses. User-visible flows MUST expose recoverable API/camera failures and avoid silently fabricating successful data.
- Analytics, RUM, and error-tracking services are out of scope unless a separate product/privacy decision explicitly introduces them.

## Dependencies

- A new runtime dependency MUST solve a named current gap that existing React, browser APIs, shared primitives, or installed packages cannot reasonably solve.
- The change MUST identify bundle/runtime impact, maintenance owner, licensing/security fit, SSR/hydration compatibility when relevant, and focused tests.
- Do not add a package solely for a small helper, styling convention, or abstraction without a current reused consumer.

## Reference: `ai/architecture/web-architecture.md`

# Web Architecture

`apps/web` is organized by bounded product contexts while sharing only stable infrastructure.

## Bounded Contexts

- `src/pages/<Context>` owns page composition, context-specific components, hooks, stores, and workflow helpers for solve/scan, timer, algorithms, notation, records, channels, and sites.
- `src/api/<domain>` owns transport adapters, runtime response validation, React Query operations, and domain API types. `src/api/client` owns shared HTTP mechanics.
- `src/components` owns primitives and layout with real cross-context consumers; it MUST NOT absorb page-specific workflow logic.
- `src/seo` owns the route manifest, locale-aware canonical metadata, alternates, JSON-LD, and indexability.
- `src/main` owns browser startup, runtime locale selection, static rendering entry, and hydration.
- `src/i18n/locales` owns visible copy. `public` owns copied static assets, not application behavior.
- `packages/rubiks-cube` owns browser visualization adapters; Rust remains authoritative for solving and cube validity.

Dependencies point inward from pages to shared components, API, and SEO infrastructure. Contexts SHOULD communicate through typed props, route state, or explicit shared contracts rather than importing another page's internals.

## SSG And Runtime

- Production build MUST statically render every routable route/locale pair with real React server rendering. Indexable routes additionally participate in sitemap and hreflang; valid but incomplete surfaces remain routable with `noindex` until complete.
- Browser startup MUST use `hydrateRoot` when static markup exists and `createRoot` only for a genuinely empty mount.
- After hydration, React Router provides SPA navigation; SSG is not a separate static-only implementation.
- Rendered HTML, canonical URL, `html lang`, title, description, hreflang alternates, and JSON-LD MUST agree for a route and locale.
- Unknown routes and valid non-indexable routes MUST remain `noindex`; valid non-indexable routes still return their application HTML with status 200. Unknown `/api/*` paths MUST never fall through to HTML.

## React Runtime

- The web app uses React 19 with React Compiler configured by Vite's React compiler preset. The compiler handles client render memoization; source code stays declarative without manual memoization wrappers.
- The Vite client build and Vitest's jsdom suite run through the compiler. SSG remains server-rendered through Vite's SSR pipeline.

## Locale Contract

- `en-US` is canonical and has no URL prefix. The other supported locales are `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh`, and `ja`.
- A locale MAY be published in navigation, alternates, sitemap, or generated SSG paths only when all user-visible and SEO content for that published surface is translated, with key and placeholder parity.
- Stable slugs are product identifiers and are not required to be English. Do not translate an established slug per locale; changing one requires redirect and canonical-link planning.

## Server Integration

- Axum serves versioned assets with immutable caching, known static route files, and a neutral non-hydrated `404.html` only for unknown web paths.
- `/` permanently redirects to the canonical solve route. `/api/wca-data` is an Axum 308 redirect to the WCA Data docs.
- Legacy `/algoritmos` route prefixes permanently redirect to the matching canonical `/algorithms` path, including locale-prefixed paths and query strings.
- Security headers are server-owned. Browser code MUST remain compatible with the configured CSP and permissions policy.
