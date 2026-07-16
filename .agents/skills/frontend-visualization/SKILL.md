---
name: "frontend-visualization"
description: "Use when changing cube rendering, playback, visualization adapters, or scan visualization."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-visualization.md`.

Referenced context:
- `../../../ai/rules/frontend-rules.md`
- `../../../ai/rules/frontend-quality-rules.md`
- `../../../ai/architecture/frontend-visualization.md`
- `../../../ai/architecture/rubiks-cube-visualization-package.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-visualization

## Canonical Skill: `ai/skills/frontend-visualization.md`

# Frontend Visualization

Use for cube rendering, playback, visualization adapters, or scan visualization.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/frontend-visualization.md`
- `ai/architecture/rubiks-cube-visualization-package.md`

## Workflow

- Identify the owning puzzle/page context and preserve the Rust solver boundary.
- Use the active package's narrow puzzle subpath; keep imperative rendering sync in focused hooks/refs.
- Keep scanner evidence and reviewed stickers in typed scan contracts, with disclosure before camera permission and automatic analysis after permission.
- Verify rendering, cancellation, accessibility, reduced motion, mobile sizing, and the relevant solve/scan E2E flow.

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

## Verification

- Run web build, lint, and targeted tests for changed behavior.
- Run SSG/SEO and E2E checks when routing, locales, metadata, hydration, scanner, timer, or solve flows change.

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
- The Solver cube MUST auto-load after at most three seconds when visualization is supported. Tests MUST prove the cube appears without clicking the preparing state; manual activation remains only an early-load and retry affordance.
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

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders solver interaction, scan workflows, notation pages, algorithms pages, timer flows, and visualization playback. It must not become the source of truth for puzzle logic.

## Boundary

- The Rust HTTP API and `cube-engine` own solver behavior, puzzle validation, search, heuristics, and replay verification.
- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- React components own user interaction, form controls, loading indicators, result display, visualization playback, and local UI state.
- `@rubiks-cube-solver/rubiks-cube` is a private visualization package and adapter surface, not the solver core.
- Facelet, Kociemba, sticker-state, and visual-state strings are adapter details. Typed scan-session requests MAY carry reviewed stickers and manual overrides; notation solve forms MUST NOT expose raw state input.

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
- A supported Solver visualization requests its renderer automatically no later than three seconds after the page mounts. Solver input or a solve result may request it sooner; clicking the preparing state is an optional acceleration or retry path, never a prerequisite for seeing the cube.
- Notation visualizations request their renderer automatically when their stage approaches the viewport, subject to reduced-data preferences.
- Selection and playback state should be represented by IDs, move indexes, notation strings, or small status values instead of duplicated puzzle objects when possible.
- The visible cube should remain within the established 350px by 350px UI constraint unless the design is intentionally changed.

## Current Frontend Stack

- Vite, React, TypeScript, React Router, React Query, Zustand, Tailwind CSS v4, shadcn/Radix-backed shared primitives, `cn`, established `classnames` usage, `react-i18next`, Motion, Vitest, Storybook, and Playwright are active.
- React Hook Form and Zod are installed dependencies, not a mandatory project-wide form setup. Use them only where nearby code or schema complexity justifies them.
- `@rubiks-cube-solver/rubiks-cube` is already active through puzzle-specific subpath imports and Vite aliases.
- Additional dependencies require a specific current gap, an identified owner, and focused verification.

## Reference: `ai/architecture/rubiks-cube-visualization-package.md`

# Rubik's Cube Visualization Package

`@rubiks-cube-solver/rubiks-cube` is a private local workspace package under `packages/rubiks-cube`. It provides Three.js/web-component visualization code with subpath exports for cube view, cube 3D object, cube controller, cube notation constants, cube headless sticker state, and puzzle-specific visualization modules.

## Active Integration

- `apps/web/vite.config.ts` maps package subpaths directly to workspace source for cube view, controller, state, Three.js, and puzzle-specific modules.
- The web app uses these exports for rendering and playback. Changes MUST preserve package build types and browser bundle boundaries.
- Headless sticker state and Kociemba helpers remain visualization adapters, not canonical solver state.

## Layout

- `src/puzzles/cube`: cube and cubic NxN visualization-specific code.
- `src/puzzles/pyraminx`: Pyraminx visualization-specific code.
- `src/shared`: visualization-only helpers such as animation styles, camera state, debouncing, and turn plans.

`src/shared` must not become a generic puzzle engine. Do not add universal puzzle state, universal move types, `BaseMove`, `BaseState`, `BasePuzzle`, or solver abstractions there.

## Not The Solver Core

- The package is JavaScript and rendering-oriented.
- The state model is sticker/Kociemba oriented, not the Rust solver engine representation.
- It depends on `three` and `gsap`, which are not appropriate for the Rust engine.
- It should not be used by `crates/cube-engine`.
- It must not define canonical puzzle semantics through a generic engine or base move abstraction.

## Integration Decision

Treat it as a visualization adapter around Rust API state, not as the canonical engine.

Each supported puzzle should own its notation helpers, visual state adapter, and renderer. Shared package utilities are limited to rendering infrastructure.
