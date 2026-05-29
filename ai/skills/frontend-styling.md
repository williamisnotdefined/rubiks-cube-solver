# Frontend Styling

Use this skill when changing Tailwind CSS v4 utilities, responsive layout, visual treatment, classnames usage, or cube visualization sizing in `apps/web`.

## Goal

Preserve the existing visual language and mobile usability while using Tailwind CSS v4 and `classnames` consistently.

## Read First

- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Inspect nearby components before adding new utility combinations or visual patterns.
- Keep global CSS limited to Tailwind import, app-wide theme tokens, document defaults, and small base styles.
- Put layout and visual treatment in component `className` utilities.
- Use `classnames` as `cls` only when conditional classes or caller-provided `className` need composition.
- Preserve the 350px by 350px cube cap on desktop and mobile.
- Preserve the current square UI by avoiding `border-radius` and Tailwind `rounded-*` utilities.
- Check mobile layouts for changed forms, grids, and visualization containers.
- Avoid adding a Tailwind config or design-system abstraction unless there is a concrete current need.

## Expected Output

- Styling remains semantic HTML plus Tailwind utilities.
- Responsive behavior is preserved.
- The cube visualization stays within the product size cap.
- Conditional classes use `classnames` imported as `cls`.

## Verification

- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Search changed files for `rounded-`, `border-radius`, local `cn`, and local `classNames` helpers.
- Check mobile breakpoints when feasible.
