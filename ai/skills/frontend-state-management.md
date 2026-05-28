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
- Keep imperative custom-element sync in focused hooks and refs.
- Use IDs, indexes, notation strings, and status values instead of duplicated cube objects.
- Add external state libraries only after local state and focused hooks are insufficient.

## Expected Output

- State reset rules are colocated with the state owner.
- Components do not copy React Query data into broad mutable stores.
- Visualization state does not become solver state.
- API, form, solve result, and visualization concerns remain separable.

## Verification

- Check changed components for copied API data in unrelated local stores.
- Check editing scramble, changing limits, and solving still reset only the intended UI state.
- Run `npm run build` after state ownership changes.
