# Frontend State Management

Use for React state, custom hooks, stores, async workflow state, and visualization synchronization.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Classify the state and assign its nearest owner before moving it.
- Keep server state in React Query, scoped shared client state in existing Zustand stores only when needed, and imperative rendering details in refs/hooks.
- Define reset, cancellation, and stale-response behavior at the owner.
- Verify the changed workflow and web build.
