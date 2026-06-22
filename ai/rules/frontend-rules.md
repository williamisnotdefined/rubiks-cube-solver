# Frontend Rules

Rules for the web visualization and frontend-to-API boundary.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends move notation and receives states.
- Use the Rust HTTP API as the source of truth for solver behavior.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.
- Keep visualization package sharing limited to rendering infrastructure such as camera, animation, and web-component helpers; puzzle notation, visual state adapters, and renderers remain puzzle-specific.
- Keep the rendered 3x3 cube no larger than 350px by 350px in the web UI.
- Keep API request and response normalization in `web/src/api`, not inline in React components.
- Keep request functions free of React imports; React Query hooks are the UI-facing API boundary.
- Use React Query for API health, strategy metadata, solve mutations, and future server-state operations.
- Keep server/API load state, solve result state, form input state, and visualization playback state separately owned.
- Lift local UI state only to the nearest component that consumes it.
- Extract React components only when UI repeats or a named component makes ownership and composition clearer.
- Keep one-off UI inline when extraction would add indirection without reuse or state-boundary value.
- Keep route or screen files readable as composition; `App.tsx` should stay thin as the UI grows.
- Use React Router through the current `BrowserRouter` route setup; keep server/static hosting configured to fall back to `index.html` for frontend routes.
- Keep frontend route paths and URL segments in English stable slugs; translate visible menu labels, headings, and copy through `react-i18next` locale files under `web/src/i18n/locales`.
- Keep supported locale resources in key and interpolation-placeholder parity across `en`, `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh` for Simplified Chinese, and `ja`.
- Keep page-level route code-splitting in `App.tsx` with React `lazy`/`Suspense` when route bundles grow.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused elsewhere.
- Keep shared reusable components under `web/src/components` only after there is a real shared consumer.
- Use existing shared Radix-backed primitives for dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips instead of importing Radix directly in feature code.
- Prefer explicit props and children for reusable layout wrappers.
- Use the existing React Hook Form and Zod setup for solve-form schema validation and submission shaping; keep cube semantics and notation validity in Rust/API code.
- Use existing Zustand stores only for scoped client state that is shared beyond one component, such as timer sessions/settings, solve settings, theme, and toasts.
- Use Tailwind utility classes for styling; keep Tailwind import, resets, and semantic theme/color variables in the single `web/src/index.css` entrypoint.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not add a frontend or visualization-package generic puzzle engine, universal move type, `BaseMove`, `BaseState`, or shared puzzle-state abstraction.
- Do not expose facelets, Kociemba strings, or facelet input modes in the UI.
- Do not add or import `.css` files outside the single Tailwind/theme entrypoint `web/src/index.css`.
- Do not make browser notation clients submit facelets to the API; notation solve requests use move notation.
- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not add new frontend state, form, routing, animation, styling, or component dependencies while the existing stack can satisfy the current need.
- Do not add localized route paths; URLs stay English while labels are localized.
- Do not use native-select assumptions such as Playwright `selectOption()` for Radix Select controls.
- Do not turn a large component into a hidden god hook or god provider.
- Do not import raw request functions into UI once a project-level hook/client boundary exists for that operation.
- Do not import query keys or raw request functions into React components.
- Do not add styling or state-management dependencies to solve organization problems that focused components, hooks, and files can solve.

## External Library Note

- `@rubiks-cube-solver/rubiks-cube` is acceptable as a visualization or comparison tool, not as the Rust solver core.

## Verification

- Run `npm run build` after TypeScript, React, or API-client changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run API or engine tests too when UI changes require Rust contract changes.
