# Frontend Styling Rules

Rules for styling `apps/web` with the current plain CSS stack.

## Always

- Preserve the existing product visual language unless the task explicitly changes design direction.
- Keep global CSS limited to document defaults, base typography, selection colors, and app-wide primitives.
- Keep page-specific CSS near the owning page or feature when files are split.
- Prefer semantic HTML with focused class names over broad global selectors.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep static class names as plain strings when there is no conditional styling.
- Add a tiny local class-name helper only after repeated conditional class composition exists.

## Never

- Do not add Tailwind, CSS-in-JS, Sass, classnames, or a design-system dependency without a concrete current need.
- Do not add broad selectors to global CSS when component or page CSS can own the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.
