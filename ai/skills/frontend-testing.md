# Frontend Testing

Use for Vitest, Testing Library, API-domain tests, coverage, Storybook, and Playwright E2E.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/testing-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/web-architecture.md`

## Workflow

- Test observable behavior at the narrowest public boundary and place it in the nearest established `__tests__` folder.
- Use accessible queries and shared API/E2E helpers; cover cancellation and recoverable failures where relevant.
- Keep global statements, branches, functions, and lines thresholds at 90%.
- Run the targeted test first, then coverage, Storybook, or the relevant E2E split for the changed surface.
