# Frontend Componentization

Use this skill when adding, changing, extracting, or reusing React components, page-level screens, large frontend files, Storybook stories, or repeated UI in `web`.

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
- Move page-level screens under `web/src/pages`.
- Keep page-specific components, hooks, and helpers under the owning page folder until reused.
- Move shared primitives to `web/src/components` only when there is a real shared consumer.
- Use existing shared primitives for Radix-backed dialogs, alert dialogs, selects, switches, checkboxes, toasts, popovers, and tooltips instead of direct Radix imports in feature code.
- Move context-independent helpers such as formatting and paint timing to `web/src/core/<category>/<name>.ts` with direct imports.
- Extract focused hooks for stateful behavior such as API loading, form workflow, or custom-element synchronization.
- Add or update one Storybook story per component, using controls for props instead of separate prop-variant stories.
- Keep API request details behind `web/src/api`.
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
