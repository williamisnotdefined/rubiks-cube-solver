---
applyTo: "apps/web/**/*.{ts,tsx,css},roadmap.md"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/frontend-componentization.md`.

Referenced context:
- `../../ai/rules/frontend-component-rules.md`
- `../../ai/rules/frontend-state-rules.md`
- `../../ai/rules/frontend-form-rules.md`
- `../../ai/rules/frontend-styling-rules.md`
- `../../ai/architecture/project-architecture.md`
- `../../ai/architecture/frontend-visualization.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-componentization

## Canonical Skill: `ai/skills/frontend-componentization.md`

# Frontend Componentization

Use this skill when adding, changing, extracting, or reusing React components, page-level screens, large frontend files, Storybook stories, or repeated UI in `apps/web`.

## Goal

Split UI by real ownership and reuse while keeping solver logic in Rust and avoiding broad component abstractions.

## Read First

- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/frontend-form-rules.md`
- `ai/rules/frontend-styling-rules.md`
- `ai/architecture/project-architecture.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Identify whether the change is page composition, shared UI, page-specific UI, form behavior, visualization behavior, story coverage, or state ownership cleanup.
- Keep one-off UI inline unless extraction improves reuse, naming, or state boundaries.
- Move page-level screens under `apps/web/src/pages`.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused.
- Move shared primitives to `apps/web/src/components` only when there is a real shared consumer.
- Use existing shared primitives for Radix-backed dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips instead of direct Radix imports in feature code.
- Move context-independent helpers such as formatting and paint timing to `apps/web/src/core/<category>/<name>.ts` with direct imports.
- Extract focused hooks for stateful behavior such as API loading, form workflow, or custom-element synchronization.
- Add or update one Storybook story per component, using controls for props instead of separate prop-variant stories.
- Keep API request details behind `apps/web/src/api`.
- Keep cube validation, search, and solver behavior out of React components.

## Expected Output

- `App.tsx` stays thin and route or screen files read as composition.
- Props remain explicit and small.
- API load state, solve result state, form state, and visualization state have clear nearest owners.
- Extracted components preserve behavior and accessibility.
- Shared abstractions are added only when current reuse justifies them.
- Feature components consume shared primitives rather than duplicating portal, focus, escape, and outside-click behavior.
- Storybook coverage follows component ownership and does not create one story per prop.

## Verification

- Ensure extracted components do not change behavior.
- Run `npm run build` after TypeScript or React component moves.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run `npm run storybook:build -w @rubiks-cube-solver/web` after story changes.
- Run relevant E2E tests when product flow behavior is touched.

# Referenced Context

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

## Reference: `ai/rules/frontend-form-rules.md`

# Frontend Form Rules

Rules for forms and local validation in `apps/web`.

## Always

- Keep the browser-facing solve flow notation-only.
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

## Reference: `ai/rules/frontend-styling-rules.md`

# Frontend Styling Rules

Rules for styling `apps/web` with Tailwind CSS v4 utilities, theme tokens, and class composition.

## Always

- Use Tailwind CSS v4 through `@tailwindcss/vite` and the single required `apps/web/src/index.css` entrypoint.
- Keep `apps/web/src/index.css` as the only allowed CSS file; it may contain `@import "tailwindcss";`, project-level CSS resets, semantic theme/color variables, Tailwind v4 `@theme` token mappings, and minimal root theme selectors.
- Keep raw hex color values confined to semantic variable definitions in `apps/web/src/index.css`; application markup, components, stories, tests, and `apps/web/index.html` should use theme-backed classes or CSS variables instead.
- Define every reusable color as a semantic CSS variable in `apps/web/src/index.css` before using it in Tailwind classes.
- Expose theme colors through semantic Tailwind tokens such as `bg-app-bg`, `bg-app-nav`, `bg-app-stage`, `bg-app-surface`, `bg-app-surface-raised`, `bg-app-control`, `text-app-text`, `text-app-muted`, `text-app-inverse`, `border-app-border`, `border-app-border-strong`, and `ring-app-focus` instead of hardcoded color utilities.
- Name color tokens by UI role, not raw color names; prefer `--app-surface`, `--app-border`, and `--app-muted` over names such as `--gray-900`.
- Use system theme preference by default through `prefers-color-scheme`; explicit theme overrides, when implemented, should use a root selector such as `[data-theme="dark"]` or `[data-theme="light"]` and must still route through the same semantic variables.
- Preserve the current dark visual treatment as the `dark` theme.
- Make the `light` theme a gray, not-so-dark theme rather than a white or near-white theme.
- Put all styling in Tailwind utility classes on elements and components.
- Preserve the existing product visual language unless the task explicitly changes design direction.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep the current web UI square: do not add `border-radius` CSS or Tailwind `rounded-*` utilities.
- Use the `classnames` package for conditional class composition.
- Import `classnames` as `cls` with `import cls from 'classnames'`.
- Use object form where possible for conditional classes: `cls('base', { active: isActive })`.
- Keep static Tailwind class sets as plain strings when there are no conditions.
- Style `lucide-react` icons with Tailwind sizing/color classes such as `size-5` and inherited `text-app-*` color; do not style custom SVG path data.

## Never

- Do not add, import, or keep component, page, feature, or extra global `.css` files.
- Do not put custom selectors, theme tokens, document defaults, base styles, animations, or keyframes in any CSS file other than `apps/web/src/index.css`.
- Do not hardcode colors through Tailwind arbitrary hex color utilities.
- Do not add raw hex colors in React props, inline styles, SVG `fill`/`stroke`, tests, Storybook stories, or `apps/web/index.html`; add a semantic variable in `apps/web/src/index.css` and consume it through `var(...)` or a theme-backed Tailwind class.
- Do not duplicate raw color values in components after a semantic token exists.
- Do not make the light theme pure white, near-white, or visually disconnected from the current dark product tone.
- Do not add a Tailwind config file unless Tailwind utility classes cannot express a concrete current need.
- Do not add CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Do not use inline `<svg>` markup for UI icons or hardcoded SVG path styling in React components; use `lucide-react` icons and semantic Tailwind classes.
- Do not add local `classNames`, `cn`, or wrapper helpers without a concrete repeated need.
- Do not use template literals only to append conditional classes.
- Do not add broad selectors or global CSS rules when component utility classes can express the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Search changed files for local class-name helpers, `rounded-`, new `.css` files, inline `<svg>` UI icons, hardcoded arbitrary hex color utilities, and raw hex colors outside `apps/web/src/index.css` before finishing.
- Run `npm run theme-colors:check` after changing theme tokens, Tailwind color classes, docs that mention color rules, or generated AI route content.
- Run `npm run build` after Tailwind or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check both system-default theme behavior and explicit `dark`/`light` theme behavior when theme code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.

## Reference: `ai/architecture/project-architecture.md`

# Project Architecture

The target is a hybrid Rubik's Cube solver with a Rust engine, search algorithms, heuristics, pattern databases, optional ML heuristics, a native HTTP API, and a modern web visualization.

## Current Structure

- `crates/cube-engine`: Rust crate for cube representation, moves, notation, scramble handling, search, and heuristics.
- `crates/api`: Axum HTTP API around the Rust engine and generated pruning-table artifacts.
- `apps/web`: Vite React app for notation-only solve requests, cube visualization, and playback-oriented UI.
- `datasets`: generated and fixture data for solver/ML experiments.
- `ml`: Python training and smoke-test code for learned value baselines.
- `ai`: canonical AI knowledge base and route generation system.
- `roadmap.md`: source roadmap and implementation order.

## Generated Artifacts

- Native pruning tables are generated by `cube-engine` binaries and loaded by `crates/api`.
- Solver quality reports and real-scramble gates are executable verification artifacts, not frontend behavior.
- ML datasets should be generated from deterministic Rust solver behavior before training code consumes them.

## Future Or Optional Boundaries

- `crates/wasm`: optional future wasm-bindgen bridge around the Rust engine if browser-local solving becomes a concrete roadmap item.
- Additional frontend routing, shared component libraries, or state managers should wait for current UI complexity to require them.

## Ownership

- Cube state, moves, validation, search, and heuristics belong in Rust.
- The API validates HTTP contracts, applies safety limits, calls Rust solver code, and returns typed solver results.
- Frontend code should only render, collect notation/limits, send solve requests, receive states, and play animations.
- ML code should consume generated datasets and expose learned heuristics only after deterministic search is correct.

## Reference: `ai/architecture/frontend-visualization.md`

# Frontend Visualization Architecture

The frontend renders and controls solver interaction. It must not become the source of truth for cube logic.

## Current Stack

- TypeScript
- React
- Vite
- React Router 7 with `HashRouter` for `#/solve` and `#/timer` routes, with page-level route code-splitting through React `lazy`/`Suspense`
- `@tanstack/react-query` for API health, strategy metadata, and solve mutation state
- `@houstonp/rubiks-cube` as a visualization custom element
- Tailwind CSS v4 through `@tailwindcss/vite` and the single `apps/web/src/index.css` entrypoint for Tailwind import, resets, and semantic theme/color variables
- `classnames` imported as `cls` for conditional class composition
- `lucide-react` for UI icons; local SVG icon components and custom icon path data are not part of the frontend icon surface
- Radix-backed shared primitives for dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips rendered through the wrappers in `apps/web/src/components`
- React Hook Form and Zod for solve-form limit validation and submission shaping
- Zustand for scoped timer, solve-settings, theme, and toast state
- TanStack Table and TanStack Virtual for timer solve-table rendering
- Motion for small overlay, select, toast, and error-boundary transitions with reduced-motion support
- Vitest, Testing Library, and V8 coverage for unit/component/API-hook tests
- Storybook for component stories and visual inspection
- Playwright for product, scan, and timer E2E flows

## Optional Additions

- React Three Fiber or another vetted Three.js abstraction only if the current custom element cannot support the needed visualization behavior.
- Additional global state, routing, form, animation, or component dependencies only after the existing stack cannot satisfy a concrete current need.

## Boundary

The frontend sends move notation and receives states from the Rust HTTP API. Rendering, playback, camera controls, and interaction state can live in the frontend. Cube validation, solver behavior, search, and heuristics stay in Rust.

Facelet/Kociemba strings are internal adapter details only. They must not appear as UI copy, input modes, or client-submitted API payloads. If a visualization library requires a sticker string, keep that detail hidden behind a neutral rendering-state field.

The visible cube must fit within a 350px by 350px box on desktop and mobile.

The solve form defaults to an empty scramble so the visualization starts solved; sample scrambles are placeholders or examples.

## Data And State Flow

- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- API operations are grouped by domain under `apps/web/src/api/<domain>` with request functions, React Query hooks, operation barrels, domain barrels, and domain query keys.
- React Query owns API health, strategy metadata, solve mutation pending/error/data state, and future server-state operations.
- Zustand owns only scoped client state that is already shared across components or routes, such as timer sessions/settings, solve settings, theme, and toasts.
- React components own local form inputs, loading indicators, result display, and visualization playback state.
- API load state, solve result state, form state, and visualization state should remain separate unless a single owner explicitly coordinates them.
- Selection or playback state should be represented by IDs, move indexes, or notation strings rather than duplicated cube objects when possible.
- Imperative custom-element synchronization should live in focused visualization hooks and refs, not broad page effects.
- Visualization-local parsing may drive rendering of supported move tokens, but Rust remains authoritative for notation semantics and cube validity.

## UI Composition

- `App.tsx` should stay thin and delegate the product screen to page-level modules.
- Route-level code-splitting belongs in `App.tsx`; keep page-specific lazy chunks behind the current `HashRouter` routes.
- Keep route or screen components readable as composition as the UI grows.
- Extract named components for repeated panels, controls, result sections, or visualization shells when the extraction clarifies ownership.
- Keep page-specific pieces colocated near the owning screen until reused elsewhere.
- Shared reusable UI should live under `apps/web/src/components` only when there is a real shared consumer.
- Context-independent helpers live under `apps/web/src/core/<category>/<name>.ts` and are imported directly without core barrels.
- Keep page-specific hooks, validation helpers, message mapping, and constants under the owning page folder until reuse exists.
- Use shared component primitives for repeated interaction patterns; feature code should consume wrappers such as `Dialog`, `AlertDialog`, `Select`, `Switch`, `Checkbox`, `Toast`, `Popover`, and `Tooltip` rather than direct Radix imports or hand-rolled portal/focus/outside-click handling.
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

- `apps/web/src/index.css` is the only allowed CSS file and owns Tailwind import, project-level CSS resets, semantic theme/color variables, Tailwind v4 token mappings, and minimal root theme selectors.
- Component layout, visual treatment, animations, and state styles should use Tailwind utilities.
- Reusable color values must be defined as semantic CSS variables in `apps/web/src/index.css` and consumed through semantic Tailwind utilities such as `bg-app-bg`, `bg-app-nav`, `bg-app-stage`, `bg-app-surface`, `bg-app-surface-raised`, `bg-app-control`, `text-app-text`, `text-app-muted`, `text-app-inverse`, `border-app-border`, `border-app-border-strong`, and `ring-app-focus`.
- Do not use hardcoded arbitrary Tailwind hex color utilities in components, stories, tests, or `apps/web/index.html`.
- Do not add raw hex colors outside `apps/web/src/index.css`; SVG `fill`/`stroke` and dynamic inline styles should use semantic CSS variables such as `var(--app-text)` or scan-specific variables such as `var(--scan-u-bg)`.
- Theme behavior defaults to the user's system preference; the `dark` theme preserves the current visual palette, and the `light` theme should be gray/not-so-dark rather than white.
- `npm run theme-colors:check` enforces that raw hex colors stay in `apps/web/src/index.css` and that docs do not reintroduce literal arbitrary hex utility markers.
- The current web UI is intentionally square; do not add `border-radius` or Tailwind `rounded-*` utilities.
- Conditional class composition uses `classnames` as `cls`.
- Icons use `lucide-react` components styled with semantic Tailwind classes; React components should not include inline SVG icon markup.
- Do not add component/page CSS files, CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Desktop and mobile layouts should be considered for every UI change.

## Tests And Stories

- Shared web test setup lives under `apps/web/src/test`.
- React Query hook tests use test `QueryClient` providers with retry disabled.
- API request tests mock fetch success and API error payloads.
- Coverage runs with `npm run test:coverage -w @rubiks-cube-solver/web` and keeps thresholds at 95% or higher.
- Storybook builds with `npm run storybook:build -w @rubiks-cube-solver/web`.
- Playwright E2E tests use accessible roles and labels. Radix Select controls are not native `<select>` elements, so specs use helpers under `tests/e2e/select-helpers.ts` instead of `selectOption()` or `locator('option')`.
- E2E commands are split by scope: `npm run test:e2e:smoke` for product/responsive/timer smoke, `npm run test:e2e:scan` for serial manual scan coverage, `npm run test:e2e:full` for the complete non-heavy gate, and `npm run test:e2e:heavy-scan` for opt-in generated scan reports.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

If a visualization library requires a facelet or sticker-state string, keep that value as a rendering adapter detail. The UI should still speak in scramble notation, solution moves, limits, and solver statuses.
