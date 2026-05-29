# Frontend Styling Rules

Rules for styling `apps/web` with Tailwind CSS v4 and class composition.

## Always

- Use Tailwind CSS v4 through `@tailwindcss/vite` and `@import "tailwindcss"`.
- Keep global CSS limited to Tailwind import, app-wide theme tokens, document defaults, and small base styles.
- Prefer Tailwind utility classes in components over custom CSS selectors.
- Preserve the existing product visual language unless the task explicitly changes design direction.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep the current web UI square: do not add `border-radius` CSS or Tailwind `rounded-*` utilities.
- Use the `classnames` package for conditional class composition.
- Import `classnames` as `cls` with `import cls from 'classnames'`.
- Use object form where possible for conditional classes: `cls('base', { active: isActive })`.
- Keep static Tailwind class sets as plain strings when there are no conditions.

## Never

- Do not add a Tailwind config file unless custom theme primitives cannot stay in CSS tokens.
- Do not add CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Do not add local `classNames`, `cn`, or wrapper helpers without a concrete repeated need.
- Do not use template literals only to append conditional classes.
- Do not add broad selectors to global CSS when component utility classes can express the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Search changed files for local class-name helpers and `rounded-` before finishing.
- Run `npm run build` after CSS or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.
