# Frontend Styling

Use for Tailwind utilities, theme tokens, responsive layout, and visual treatment.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-quality-rules.md`

## Workflow

- Follow nearby shadcn-compatible UI patterns and semantic tokens in the single CSS entrypoint.
- Use static class strings when possible, the existing `cn` helper for shared primitives/class merging, and established `classnames` usage in feature code when merge semantics are unnecessary.
- Check focus, reduced motion, themes, mobile layout, and visualization sizing.
- Run `npm run theme-colors:check`, web build, and lint.
