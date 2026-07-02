# Frontend Styling

Use this skill when changing Tailwind CSS v4 utilities, theme/color variables, responsive layout, visual treatment, classnames usage, or cube visualization sizing in `apps/web`.

## Goal

Preserve the existing visual language and mobile usability while using Tailwind CSS v4, semantic theme tokens, and `classnames` consistently.

## Read First

- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/architecture/frontend-visualization.md`

## Workflow

- Inspect nearby components before adding new utility combinations or visual patterns.
- Do not create or import `.css` files; `apps/web/src/index.css` is the only allowed CSS file and owns Tailwind import, project resets, semantic theme/color variables, and minimal root theme selectors.
- Put all reusable color values in semantic variables in `apps/web/src/index.css` before using them from Tailwind utilities.
- Use Tailwind classes backed by semantic tokens such as `bg-app-bg`, `bg-app-nav`, `bg-app-stage`, `bg-app-surface`, `bg-app-surface-raised`, `bg-app-control`, `text-app-text`, `text-app-muted`, `text-app-inverse`, `border-app-border`, `border-app-border-strong`, and `ring-app-focus`; do not add hardcoded arbitrary color classes.
- Keep raw hex color values confined to semantic variable definitions in `apps/web/src/index.css`; use theme-backed classes or CSS variables in components, stories, tests, SVG attributes, inline styles, and `apps/web/index.html`.
- Keep theme behavior system-default by default, with explicit `dark` and `light` overrides only through root theme selectors when implemented.
- Treat the current visual palette as `dark`; make `light` a gray, not-so-dark theme rather than a white theme.
- Put all layout, visual treatment, animations, and state styles in component `className` utilities.
- Use `classnames` as `cls` only when conditional classes or caller-provided `className` need composition.
- Preserve the 350px by 350px cube cap on desktop and mobile.
- Preserve the current square UI by avoiding `border-radius` and Tailwind `rounded-*` utilities.
- Check mobile layouts for changed forms, grids, and visualization containers.
- Avoid adding a Tailwind config or design-system abstraction unless there is a concrete current need.

## Expected Output

- Styling remains semantic HTML plus Tailwind utilities, with no component or page CSS files.
- `apps/web/src/index.css` remains the only CSS file and contains only Tailwind import, resets, semantic theme/color variables, Tailwind token mappings, and minimal root theme selectors.
- Components use semantic color utilities instead of hardcoded arbitrary hex colors.
- Theme behavior defaults to system preference, with the current dark theme preserved and the light theme kept gray/not-so-dark.
- Responsive behavior is preserved.
- The cube visualization stays within the product size cap.
- Conditional classes use `classnames` imported as `cls`.

## Verification

- Run `npm run build` after Tailwind or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run `npm run theme-colors:check` when changing theme tokens, Tailwind color classes, docs that mention color rules, or generated AI route content.
- Search changed files for `rounded-`, `border-radius`, local `cn`, local `classNames` helpers, new `.css` files, hardcoded arbitrary hex color utilities, and raw hex colors outside `apps/web/src/index.css`.
- Check system-default, `dark`, and `light` theme behavior when theme code changes.
- Check mobile breakpoints when feasible.
