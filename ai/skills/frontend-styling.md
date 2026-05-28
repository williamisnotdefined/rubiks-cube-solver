# Frontend Styling

Use this skill when changing CSS, responsive layout, visual treatment, or cube visualization sizing in `apps/web`.

## Goal

Preserve the existing visual language and mobile usability while keeping the plain CSS stack small.

## Read First

- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Inspect nearby CSS and components before adding new selectors or visual patterns.
- Keep global CSS limited to base document styling and app-wide primitives.
- Keep page or component styling near the owning page or feature when files are split.
- Preserve the 350px by 350px cube cap on desktop and mobile.
- Check mobile layouts for changed forms, grids, and visualization containers.
- Avoid adding styling dependencies unless there is a concrete current need.

## Expected Output

- Styling remains semantic HTML plus focused CSS classes.
- Responsive behavior is preserved.
- The cube visualization stays within the product size cap.
- No new styling framework or class-name library is introduced without need.

## Verification

- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints when feasible.
