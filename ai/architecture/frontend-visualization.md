# Frontend Visualization Architecture

The frontend renders and controls solver interaction. It must not become the source of truth for cube logic.

## Current Stack

- TypeScript
- React
- Vite
- React Router 7 with `BrowserRouter` for clean `/solve` and `/timer` routes, with page-level route code-splitting through React `lazy`/`Suspense`
- `@tanstack/react-query` for API health, strategy metadata, and solve mutation state
- `@rubiks-cube-solver/rubiks-cube` as a local visualization custom element package
- Tailwind CSS v4 through `@tailwindcss/vite` and the single `web/src/index.css` entrypoint for Tailwind import, resets, and semantic theme/color variables
- `classnames` imported as `cls` for conditional class composition
- `lucide-react` for UI icons; local SVG icon components and custom icon path data are not part of the frontend icon surface
- Radix-backed shared primitives for dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips rendered through the wrappers in `web/src/components`
- React Hook Form and Zod for solve-form limit validation and submission shaping
- Zustand for scoped timer, solve-settings, theme, and toast state
- `react-i18next` locale resources under `web/src/i18n/locales` for `en`, `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh` for Simplified Chinese, and `ja`
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

- `web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- API operations are grouped by domain under `web/src/api/<domain>` with request functions, React Query hooks, operation barrels, domain barrels, and domain query keys.
- React Query owns API health, strategy metadata, solve mutation pending/error/data state, and future server-state operations.
- Zustand owns only scoped client state that is already shared across components or routes, such as timer sessions/settings, solve settings, theme, and toasts.
- React components own local form inputs, loading indicators, result display, and visualization playback state.
- API load state, solve result state, form state, and visualization state should remain separate unless a single owner explicitly coordinates them.
- Selection or playback state should be represented by IDs, move indexes, or notation strings rather than duplicated cube objects when possible.
- Imperative custom-element synchronization should live in focused visualization hooks and refs, not broad page effects.
- Visualization-local parsing may drive rendering of supported move tokens, but Rust remains authoritative for notation semantics and cube validity.

## UI Composition

- `App.tsx` should stay thin and delegate the product screen to page-level modules.
- Route-level code-splitting belongs in `App.tsx`; keep page-specific lazy chunks behind the current `BrowserRouter` routes.
- Route paths use English stable slugs such as `/solve`, `/timer`, and `/channels`; translate visible navigation labels and page copy with `react-i18next`, not localized URLs.
- Supported locale files must preserve the same translation keys and interpolation placeholders as `en.json`.
- Keep route or screen components readable as composition as the UI grows.
- Extract named components for repeated panels, controls, result sections, or visualization shells when the extraction clarifies ownership.
- Keep page-specific pieces colocated near the owning screen until reused elsewhere.
- Shared reusable UI should live under `web/src/components` only when there is a real shared consumer.
- Context-independent helpers live under `web/src/core/<category>/<name>.ts` and are imported directly without core barrels.
- Keep page-specific hooks, validation helpers, message mapping, and constants under the owning page folder until reuse exists.
- Use shared component primitives for repeated interaction patterns; feature code should consume wrappers such as `Dialog`, `AlertDialog`, `Select`, `Switch`, `Checkbox`, `Toast`, `Popover`, and `Tooltip` rather than direct Radix imports or hand-rolled portal/focus/outside-click handling.
- Keep new or substantially changed React component files at or below 400 lines where practical.
- Storybook stories live in a `stories/` child folder beside the source area they cover.
- Use one primary story export per component and rely on controls for prop variation.

## API Hooks

- `web/src/api/client.ts` owns base URL handling, JSON request helpers, and transport error mapping.
- Request functions contain no React imports.
- React Query hooks are the UI-facing API boundary and live beside their operation request function.
- Domain barrels should export hooks for UI consumption; components should not import raw request functions or query keys.
- Domain-level API failures stay as typed normalized results when the API returns a stable payload; transport errors stay in React Query error state.
- Mutation hooks own cache invalidation when mutations make cached server state stale.

## Styling

- `web/src/index.css` is the only allowed CSS file and owns Tailwind import, project-level CSS resets, semantic theme/color variables, Tailwind v4 token mappings, and minimal root theme selectors.
- Component layout, visual treatment, animations, and state styles should use Tailwind utilities.
- Reusable color values must be defined as semantic CSS variables in `web/src/index.css` and consumed through semantic Tailwind utilities such as `bg-app-bg`, `bg-app-nav`, `bg-app-stage`, `bg-app-surface`, `bg-app-surface-raised`, `bg-app-control`, `text-app-text`, `text-app-muted`, `text-app-inverse`, `border-app-border`, `border-app-border-strong`, and `ring-app-focus`.
- Do not use hardcoded arbitrary Tailwind hex color utilities in components, stories, tests, or `web/index.html`.
- Do not add raw hex colors outside `web/src/index.css`; SVG `fill`/`stroke` and dynamic inline styles should use semantic CSS variables such as `var(--app-text)` or scan-specific variables such as `var(--scan-u-bg)`.
- Theme behavior defaults to the user's system preference; the `dark` theme preserves the current visual palette, and the `light` theme should be gray/not-so-dark rather than white.
- `npm run theme-colors:check` enforces that raw hex colors stay in `web/src/index.css` and that docs do not reintroduce literal arbitrary hex utility markers.
- The current web UI is intentionally square; do not add `border-radius` or Tailwind `rounded-*` utilities.
- Conditional class composition uses `classnames` as `cls`.
- Icons use `lucide-react` components styled with semantic Tailwind classes; React components should not include inline SVG icon markup.
- Do not add component/page CSS files, CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Desktop and mobile layouts should be considered for every UI change.

## Tests And Stories

- Shared web test setup lives under `web/src/test`.
- React Query hook tests use test `QueryClient` providers with retry disabled.
- API request tests mock fetch success and API error payloads.
- Coverage runs with `npm run test:coverage -w @rubiks-cube-solver/web` and keeps thresholds at 95% or higher.
- Storybook builds with `npm run storybook:build -w @rubiks-cube-solver/web`.
- Playwright E2E tests use accessible roles and labels. Radix Select controls are not native `<select>` elements, so specs use helpers under `tests/e2e/select-helpers.ts` instead of `selectOption()` or `locator('option')`.
- E2E commands are split by scope: `npm run test:e2e:smoke` for product/responsive/timer smoke, `npm run test:e2e:scan` for serial manual scan coverage, `npm run test:e2e:full` for the complete non-heavy gate, and `npm run test:e2e:heavy-scan` for opt-in generated scan reports.

## Visualization Libraries

Visualization-only libraries can be used if they do not own the solver state. They should adapt to engine output rather than define engine behavior.

If a visualization library requires a facelet or sticker-state string, keep that value as a rendering adapter detail. The UI should still speak in scramble notation, solution moves, limits, and solver statuses.
