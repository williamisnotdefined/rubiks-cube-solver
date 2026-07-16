# Frontend Componentization

Use for React component extraction, shared primitives, page composition, and Storybook surfaces.

## Read First

- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/web-architecture.md`

## Workflow

- Locate the bounded context and identify the concrete ownership or reuse benefit.
- Keep page-specific code local; promote only demonstrated cross-context UI.
- Preserve semantics, focus/keyboard behavior, state ownership, and the established shadcn-compatible visual language.
- Run targeted tests, Storybook build when stories change, then web build and lint.
