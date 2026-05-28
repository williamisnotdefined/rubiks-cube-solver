---
applyTo: "apps/web/**/*.{ts,tsx,css},roadmap.md"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/frontend-styling.md`.

Referenced context:
- `../../ai/rules/frontend-styling-rules.md`
- `../../ai/rules/frontend-component-rules.md`
- `../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-styling

## Canonical Skill: `ai/skills/frontend-styling.md`

# Frontend Styling

Use this skill when changing CSS, responsive layout, visual treatment, or cube visualization sizing in `apps/web`.

## Goal

Preserve the existing visual language and mobile usability while keeping the plain CSS stack small.

## Read First

- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Inspect nearby CSS and components before adding new selectors or visual patterns.
- Keep global CSS limited to base document styling and app-wide primitives.
- Keep page or component styling near the owning page or feature when files are split.
- Preserve the 350px by 350px cube cap on desktop and mobile.
- Check mobile layouts for changed forms, grids, and visualization containers.
- Avoid adding styling dependencies unless there is a concrete current need.

## Expected Output

- Styling remains semantic HTML plus focused CSS classes.
- Responsive behavior is preserved.
- The cube visualization stays within the product size cap.
- No new styling framework or class-name library is introduced without need.

## Verification

- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints when feasible.

# Referenced Context

## Reference: `ai/rules/frontend-styling-rules.md`

# Frontend Styling Rules

Rules for styling `apps/web` with the current plain CSS stack.

## Always

- Preserve the existing product visual language unless the task explicitly changes design direction.
- Keep global CSS limited to document defaults, base typography, selection colors, and app-wide primitives.
- Keep page-specific CSS near the owning page or feature when files are split.
- Prefer semantic HTML with focused class names over broad global selectors.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep static class names as plain strings when there is no conditional styling.
- Add a tiny local class-name helper only after repeated conditional class composition exists.

## Never

- Do not add Tailwind, CSS-in-JS, Sass, classnames, or a design-system dependency without a concrete current need.
- Do not add broad selectors to global CSS when component or page CSS can own the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.

## Reference: `ai/rules/frontend-component-rules.md`

# Frontend Component Rules

Rules for React component boundaries in `apps/web`.

## Always

- Keep route or screen files readable as composition.
- Extract components when UI repeats or a named component clarifies ownership, state boundaries, or screen structure.
- Keep one-off UI inline when extraction only adds indirection.
- Keep page-level screens under `apps/web/src/pages`.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `apps/web/src/components` only after there is a real shared consumer.
- Keep visualization-specific components and hooks near the owning visualization feature unless reused.
- Keep context-independent helpers in focused utility files, not inside React components.
- Keep React component props explicit and small.
- Prefer `children` for layout wrappers such as panels, shells, and result regions.
- Extract focused hooks for repeated or stateful UI behavior, but do not hide an oversized component in a single oversized hook.
- Keep new or substantially changed React component files at or below 400 lines where practical.

## Never

- Do not turn every extraction into a broad component library.
- Do not move page, cube, solver, API, or visualization-specific helpers into shared utilities before reuse exists.
- Do not let `App.tsx`, page files, or hooks become god modules.
- Do not fix a god component by moving all state and effects into a god provider or god hook.
- Do not create React Context for mutable UI state.
- Do not render short fixed control groups through artificial arrays when direct JSX is clearer.
- Do not mix cube validation, search, or solver behavior into React components.

## Data-Driven Rendering

- Use arrays and `.map()` for API data, dynamic collections, long repeated groups, or lists whose members are not all known at author time.
- Render items directly when the UI is a short fixed set of product controls.

## Verification

- Ensure extracted components do not change user-visible behavior.
- Run `npm run build` after TypeScript or React component moves.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders and controls solver interaction. It must not become the source of truth for cube logic.

## Current Stack

- TypeScript
- React
- Vite
- `@tanstack/react-query` for API health, strategy metadata, and solve mutation state
- `@houstonp/rubiks-cube` as a visualization custom element
- Plain CSS owned by `apps/web`

## Optional Additions

- React Three Fiber or another vetted Three.js abstraction only if the current custom element cannot support the needed visualization behavior.
- Zustand only when shared local UI state is truly cross-component or cross-route and nearest-owner state is insufficient.
- React Router, form libraries, Tailwind, and Storybook only after there is a concrete implemented need.

## Boundary

The frontend sends move notation and receives states from the Rust HTTP API. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

Facelet/Kociemba strings are internal adapter details only. They must not appear as UI copy, input modes, or client-submitted API payloads. If a visualization library requires a sticker string, keep that detail hidden behind a neutral rendering-state field.

The visible cube must fit within a 350px by 350px box on desktop and mobile.

## Data And State Flow

- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- API operations are grouped by domain under `apps/web/src/api/<domain>` with request functions, React Query hooks, operation barrels, domain barrels, and domain query keys.
- React Query owns API health, strategy metadata, solve mutation pending/error/data state, and future server-state operations.
- React components own local form inputs, loading indicators, result display, and visualization playback state.
- API load state, solve result state, form state, and visualization state should remain separate unless a single owner explicitly coordinates them.
- Selection or playback state should be represented by IDs, move indexes, or notation strings rather than duplicated cube objects when possible.
- Imperative custom-element synchronization should live in focused visualization hooks and refs, not broad page effects.
- Visualization-local parsing may drive rendering of supported move tokens, but Rust remains authoritative for notation semantics and cube validity.

## UI Composition

- `App.tsx` should stay thin and delegate the product screen to page-level modules.
- Keep route or screen components readable as composition as the UI grows.
- Extract named components for repeated panels, controls, result sections, or visualization shells when the extraction clarifies ownership.
- Keep page-specific pieces colocated near the owning screen until reused elsewhere.
- Shared reusable UI should live under `apps/web/src/components` only when there is a real shared consumer.
- Context-independent helpers can live under a focused utility area, but solver or API-specific helpers should stay with their owning feature.
- Keep page-specific hooks, validation helpers, message mapping, constants, and CSS under the owning page folder until reuse exists.
- Keep new or substantially changed React component files at or below 400 lines where practical.

## API Hooks

- `apps/web/src/api/client.ts` owns base URL handling, JSON request helpers, and transport error mapping.
- Request functions contain no React imports.
- React Query hooks are the UI-facing API boundary and live beside their operation request function.
- Domain barrels should export hooks for UI consumption; components should not import raw request functions or query keys.
- Domain-level API failures stay as typed normalized results when the API returns a stable payload; transport errors stay in React Query error state.

## Styling

- Global CSS should stay limited to document defaults and app-wide base styles.
- Page-specific CSS belongs near the owning page or feature when files are split.
- Do not add Tailwind, CSS-in-JS, Sass, class-name libraries, Storybook, or a design-system dependency without a concrete current need.
- Desktop and mobile layouts should be considered for every UI change.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

If a visualization library requires a facelet or sticker-state string, keep that value as a rendering adapter detail. The UI should still speak in scramble notation, solution moves, limits, and solver statuses.
