# Frontend Rules

Rules for the web visualization and frontend-to-API boundary.

## Always

- Keep cube logic out of React components.
- Treat the frontend as a renderer and controller that sends move notation and receives states.
- Use the Rust HTTP API as the source of truth for solver behavior.
- Keep playback and visualization state separate from solver state.
- Evaluate visualization-only libraries by whether they preserve this boundary.
- Keep the rendered 3x3 cube no larger than 350px by 350px in the web UI.
- Keep API request and response normalization in `apps/web/src/api`, not inline in React components.
- Keep request functions free of React imports; React Query hooks are the UI-facing API boundary.
- Use React Query for API health, strategy metadata, solve mutations, and future server-state operations.
- Keep server/API load state, solve result state, form input state, and visualization playback state separately owned.
- Lift local UI state only to the nearest component that consumes it.
- Extract React components only when UI repeats or a named component makes ownership and composition clearer.
- Keep one-off UI inline when extraction would add indirection without reuse or state-boundary value.
- Keep route or screen files readable as composition; `App.tsx` should stay thin as the UI grows.
- Keep page-specific components, hooks, helpers, and CSS under the owning page folder until reused elsewhere.
- Keep shared reusable components under `apps/web/src/components` only after there is a real shared consumer.
- Prefer explicit props and children for reusable layout wrappers.
- Use lightweight local validation for simple solve controls; add a form library only when current form complexity requires it.
- Preserve the current plain CSS stack unless a concrete implemented need justifies a styling dependency.

## Never

- Do not implement solver algorithms in the frontend.
- Do not make a Three.js/web-component sticker state the canonical engine state.
- Do not expose facelets, Kociemba strings, or facelet input modes in the UI.
- Do not make browser clients submit facelets to the API; client-facing solve requests use move notation only.
- Do not copy API data into broad mutable stores just to pass it through the UI.
- Do not introduce Zustand, React Hook Form, Zod, React Router, Tailwind, or Storybook conventions unless the dependency exists and current UI complexity justifies it.
- Do not turn a large component into a hidden god hook or god provider.
- Do not import raw request functions into UI once a project-level hook/client boundary exists for that operation.
- Do not import query keys or raw request functions into React components.
- Do not add styling or state-management dependencies to solve organization problems that focused components, hooks, and files can solve.

## External Library Note

- `@houstonp/rubiks-cube` is acceptable as a visualization or comparison tool, not as the Rust solver core.

## Verification

- Run `npm run build` after TypeScript, React, or API-client changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run API or engine tests too when UI changes require Rust contract changes.
