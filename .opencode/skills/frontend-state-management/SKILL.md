---
name: "frontend-state-management"
description: "Use when adding or changing client-side state, custom hooks, visualization synchronization, or API load/result flow in web."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-state-management.md`.

Referenced context:
- `../../../ai/rules/frontend-state-rules.md`
- `../../../ai/rules/frontend-api-hook-rules.md`
- `../../../ai/rules/frontend-component-rules.md`
- `../../../ai/rules/frontend-form-rules.md`
- `../../../ai/architecture/frontend-visualization.md`
- `../../../ai/glossary/cube-terms.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-state-management

## Canonical Skill: `ai/skills/frontend-state-management.md`

# Frontend State Management

Use this skill when adding or changing client-side state, custom hooks, visualization synchronization, or API load/result flow in `apps/web`.

## Goal

Place each frontend state concern at the narrowest correct owner without duplicating solver or API state.

## Read First

- `ai/rules/frontend-state-rules.md`
- `ai/rules/frontend-api-hook-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-form-rules.md`
- `ai/architecture/frontend-visualization.md`
- `ai/glossary/cube-terms.md`

## Workflow

- Classify state as API load state, solve result state, form state, visualization state, page workflow state, or component-only state.
- Keep API server state and solve mutation state in React Query hooks under `apps/web/src/api`.
- Keep request construction and response normalization in `apps/web/src/api`, not page components.
- Keep page workflow state in the nearest page component that coordinates it.
- Use existing Zustand stores only for scoped shared state such as timer sessions/settings, solve settings, theme, and toasts.
- Keep imperative custom-element sync in focused hooks and refs.
- Use IDs, indexes, notation strings, and status values instead of duplicated cube objects.
- Do not add broad stores for API data or single-component UI state.

## Expected Output

- State reset rules are colocated with the state owner.
- Components do not copy React Query data into broad mutable stores.
- Visualization state does not become solver state.
- API, form, solve result, and visualization concerns remain separable.
- Existing stores stay scoped and do not become a generic app-state layer.

## Verification

- Check changed components for copied API data in unrelated local stores.
- Check editing scramble, changing limits, and solving still reset only the intended UI state.
- Run `npm run build` after state ownership changes.

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

1. `apps/web/src/api/client.ts` for shared HTTP details.
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
- Use shared Radix-backed primitives under `apps/web/src/components`, including `Dialog`, `AlertDialog`, `Select`, `Switch`, `Checkbox`, `Toast`, `Popover`, and `Tooltip`, so portal, focus, escape, and outside-click behavior stay consistent.
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

## Reference: `ai/rules/frontend-form-rules.md`

# Frontend Form Rules

Rules for forms and local validation in `web`.

## Always

- Keep notation solve forms on move notation.
- Use the existing React Hook Form and Zod setup for solve controls that need schema validation or coordinated submission shaping.
- Keep simpler form-like controls in lightweight local state when RHF/Zod would add indirection without value.
- Keep local validation near the owning form when it only validates simple limits or required values.
- Normalize move notation with `trim()` before API submission.
- Keep field labels explicit and accessible through visible text.
- Display validation messages through the page result or field-owned message region that currently owns the UX.
- Keep API safety caps visible or discoverable in the form controls that enforce them.
- Use `aria-invalid` when a specific field is invalid and the UI exposes field-level invalidity.
- Keep the default scramble input empty so the cube starts solved; sample scrambles belong in placeholders or examples, not initial form state.

## Never

- Do not expose facelet, Kociemba, sticker-state, or raw cube-state input modes in browser UI.
- Do not submit facelet or sticker-state payloads from the browser.
- Do not rely on browser validation for app-level solver messages.
- Do not add another form or validation library while React Hook Form and Zod cover the current form need.
- Do not duplicate API validation in the frontend beyond lightweight UX checks.
- Do not parse or validate cube solvability in React components.

## Boundaries

- The form owns user-entered notation and limit inputs.
- The API client owns request construction and response normalization.
- The Rust API and engine own notation semantics, cube validity, solver correctness, and safety enforcement.
- Visualization hooks may parse supported move tokens only to drive rendering, not to validate solver correctness.

## Verification

- Check invalid local limits do not send API requests.
- Check invalid notation still returns API-owned errors.
- Check the empty default scramble keeps solve disabled and the visualization solved.
- Run `npm run build` and relevant E2E tests after form behavior changes.

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

- Vite, React, TypeScript, React Router, React Query, React Hook Form, Zod, Zustand, Tailwind CSS v4, Radix-backed shared primitives, `classnames` as `cls`, `react-i18next`, Motion, Vitest, Storybook, and Playwright are the current frontend stack.
- Additional global state, routing, form, animation, styling, or component dependencies should wait until the existing stack cannot satisfy a concrete current need.

## Reference: `ai/glossary/cube-terms.md`

# Cube Terms

## Cubie

A physical movable piece of the cube. The core engine tracks cubies rather than face colors as the primary model.

## Corner

A cubie with three stickers. A 3x3 cube has eight corners.

## Edge

A cubie with two stickers. A 3x3 cube has twelve edges.

## Permutation

Which cubie occupies each position.

## Orientation

How a cubie is twisted or flipped in its current position.

## Move

A face turn such as `R`, `U`, `R'`, or `U2`.

## Scramble

A sequence of moves applied from the solved state to produce a valid cube state.

## Heuristic

An estimate of distance from a cube state to the solved state.

## Admissible Heuristic

A heuristic that never overestimates the true distance to the solved state.

## Pattern Database

A precomputed lookup table mapping partial cube states to minimum solution distances.

## Kociemba String

A facelet string format commonly used by two-phase solvers. It can be an adapter format, not the primary engine model.
