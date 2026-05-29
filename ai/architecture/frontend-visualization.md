# Frontend Visualization Architecture

The frontend renders and controls solver interaction. It must not become the source of truth for cube logic.

## Current Stack

- TypeScript
- React
- Vite
- `@tanstack/react-query` for API health, strategy metadata, and solve mutation state
- `@houstonp/rubiks-cube` as a visualization custom element
- Tailwind CSS v4 through `@tailwindcss/vite` and `@import "tailwindcss"`
- `classnames` imported as `cls` for conditional class composition
- Vitest, Testing Library, and V8 coverage for unit/component/API-hook tests
- Storybook for component stories and visual inspection

## Optional Additions

- React Three Fiber or another vetted Three.js abstraction only if the current custom element cannot support the needed visualization behavior.
- Zustand only when shared local UI state is truly cross-component or cross-route and nearest-owner state is insufficient.
- React Router and form libraries only after there is a concrete implemented need.

## Boundary

The frontend sends move notation and receives states from the Rust HTTP API. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

Facelet/Kociemba strings are internal adapter details only. They must not appear as UI copy, input modes, or client-submitted API payloads. If a visualization library requires a sticker string, keep that detail hidden behind a neutral rendering-state field.

The visible cube must fit within a 350px by 350px box on desktop and mobile.

The solve form defaults to an empty scramble so the visualization starts solved; sample scrambles are placeholders or examples.

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
- Context-independent helpers live under `apps/web/src/core/<category>/<name>.ts` and are imported directly without core barrels.
- Keep page-specific hooks, validation helpers, message mapping, constants, and CSS under the owning page folder until reuse exists.
- Keep new or substantially changed React component files at or below 400 lines where practical.
- Storybook stories live in a `stories/` child folder beside the source area they cover.
- Use one primary story export per component and rely on controls for prop variation.

## API Hooks

- `apps/web/src/api/client.ts` owns base URL handling, JSON request helpers, and transport error mapping.
- Request functions contain no React imports.
- React Query hooks are the UI-facing API boundary and live beside their operation request function.
- Domain barrels should export hooks for UI consumption; components should not import raw request functions or query keys.
- Domain-level API failures stay as typed normalized results when the API returns a stable payload; transport errors stay in React Query error state.
- Mutation hooks own cache invalidation when mutations make cached server state stale.

## Styling

- Global CSS should stay limited to Tailwind import, app-wide theme tokens, document defaults, and small base styles.
- Component layout and visual treatment should use Tailwind utilities.
- The current web UI is intentionally square; do not add `border-radius` or Tailwind `rounded-*` utilities.
- Conditional class composition uses `classnames` as `cls`.
- Do not add CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Desktop and mobile layouts should be considered for every UI change.

## Tests And Stories

- Shared web test setup lives under `apps/web/src/test`.
- React Query hook tests use test `QueryClient` providers with retry disabled.
- API request tests mock fetch success and API error payloads.
- Coverage runs with `npm run test:coverage -w @rubiks-cube-solver/web` and keeps thresholds at 95% or higher.
- Storybook builds with `npm run storybook:build -w @rubiks-cube-solver/web`.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

If a visualization library requires a facelet or sticker-state string, keep that value as a rendering adapter detail. The UI should still speak in scramble notation, solution moves, limits, and solver statuses.
