---
name: "frontend-state-management"
description: "Use when changing React state, hooks, stores, async workflow ownership, or visualization synchronization."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-state-management.md`.

Referenced context:
- `../../../ai/rules/frontend-state-rules.md`
- `../../../ai/rules/frontend-quality-rules.md`
- `../../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-state-management

## Canonical Skill: `ai/skills/frontend-state-management.md`

# Frontend State Management

Use for React state, custom hooks, stores, async workflow state, and visualization synchronization.

## Read First

- `ai/rules/frontend-state-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Classify the state and assign its nearest owner before moving it.
- Keep server state in React Query, scoped shared client state in existing Zustand stores only when needed, and imperative rendering details in refs/hooks.
- Define reset, cancellation, and stale-response behavior at the owner.
- Verify the changed workflow and web build.

# Referenced Context

## Reference: `ai/rules/frontend-state-rules.md`

# Frontend State Rules

Rules for client-side state ownership in `apps/web`.

## Always

- Classify state as API load state, solve result state, form state, visualization state, page workflow state, or component-only UI state before moving it.
- Keep API request details and response normalization in `apps/web/src/api`.
- Use React Query as the owner for API health, strategy metadata, solve mutation state, and future server-state operations.
- Keep API load state separate from solve result state.
- Keep form input state separate from visualization playback state.
- Keep visualization sync state in focused visualization hooks or components.
- Use local component state for short-lived UI state owned by one component.
- Lift state only to the nearest common owner that explicitly consumes it.
- Keep state reset rules next to the state owner.
- Represent selection or playback state by notation strings, move indexes, IDs, or small status values instead of duplicated cube objects.
- Use stable refs for custom element synchronization details that should not trigger renders.
- Use existing Zustand stores only for scoped client state that is genuinely shared, including timer sessions/settings, solve settings, theme, and toasts.

## Never

- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not use React Context for mutable UI state.
- Do not add broad Zustand stores for API data, single-component UI state, or state that nearest-owner React state already represents clearly.
- Do not copy React Query data into local state just to pass it to children.
- Do not make a Three.js, web-component, facelet, or sticker state the canonical engine state.
- Do not let visualization sync state own solver correctness.

## Ownership Order

1. `apps/web/src/api/client` for shared HTTP details.
2. React Query hooks under `apps/web/src/api/<domain>` for server/cache and mutation state.
3. Nearest page or screen component for coordinated product workflow state.
4. Focused hooks for repeated or stateful UI behavior.
5. Component-local `useState` for component-only state.
6. Stable refs for imperative custom element coordination.
7. Existing scoped Zustand stores only when local state and focused hooks are insufficient.

## Verification

- Check changed components do not mirror API data into unrelated local stores.
- Check reset behavior after editing scramble, changing limits, and solving.
- Run `npm run build` after state ownership changes.

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
