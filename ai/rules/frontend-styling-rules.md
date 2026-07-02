# Frontend Styling Rules

Rules for styling `apps/web` with Tailwind CSS v4 utilities, theme tokens, and class composition.

## Always

- Use Tailwind CSS v4 through `@tailwindcss/vite` and the single required `apps/web/src/index.css` entrypoint.
- Keep `apps/web/src/index.css` as the only allowed CSS file; it may contain `@import "tailwindcss";`, project-level CSS resets, semantic theme/color variables, Tailwind v4 `@theme` token mappings, and minimal root theme selectors.
- Keep raw hex color values confined to semantic variable definitions in `apps/web/src/index.css`; application markup, components, stories, tests, and `apps/web/index.html` should use theme-backed classes or CSS variables instead.
- Define every reusable color as a semantic CSS variable in `apps/web/src/index.css` before using it in Tailwind classes.
- Expose theme colors through semantic Tailwind tokens such as `bg-app-bg`, `bg-app-nav`, `bg-app-stage`, `bg-app-surface`, `bg-app-surface-raised`, `bg-app-control`, `text-app-text`, `text-app-muted`, `text-app-inverse`, `border-app-border`, `border-app-border-strong`, and `ring-app-focus` instead of hardcoded color utilities.
- Name color tokens by UI role, not raw color names; prefer `--app-surface`, `--app-border`, and `--app-muted` over names such as `--gray-900`.
- Use system theme preference by default through `prefers-color-scheme`; explicit theme overrides, when implemented, should use a root selector such as `[data-theme="dark"]` or `[data-theme="light"]` and must still route through the same semantic variables.
- Preserve the current dark visual treatment as the `dark` theme.
- Make the `light` theme a gray, not-so-dark theme rather than a white or near-white theme.
- Put all styling in Tailwind utility classes on elements and components.
- Preserve the existing product visual language unless the task explicitly changes design direction.
- Consider desktop and mobile layouts for every UI change.
- Keep the rendered 3x3 cube no larger than 350px by 350px.
- Keep the current web UI square: do not add `border-radius` CSS or Tailwind `rounded-*` utilities.
- Use the `classnames` package for conditional class composition.
- Import `classnames` as `cls` with `import cls from 'classnames'`.
- Use object form where possible for conditional classes: `cls('base', { active: isActive })`.
- Keep static Tailwind class sets as plain strings when there are no conditions.
- Style `lucide-react` icons with Tailwind sizing/color classes such as `size-5` and inherited `text-app-*` color; do not style custom SVG path data.

## Never

- Do not add, import, or keep component, page, feature, or extra global `.css` files.
- Do not put custom selectors, theme tokens, document defaults, base styles, animations, or keyframes in any CSS file other than `apps/web/src/index.css`.
- Do not hardcode colors through Tailwind arbitrary hex color utilities.
- Do not add raw hex colors in React props, inline styles, SVG `fill`/`stroke`, tests, Storybook stories, or `apps/web/index.html`; add a semantic variable in `apps/web/src/index.css` and consume it through `var(...)` or a theme-backed Tailwind class.
- Do not duplicate raw color values in components after a semantic token exists.
- Do not make the light theme pure white, near-white, or visually disconnected from the current dark product tone.
- Do not add a Tailwind config file unless Tailwind utility classes cannot express a concrete current need.
- Do not add CSS-in-JS, Sass, or a design-system dependency without a concrete current need.
- Do not use inline `<svg>` markup for UI icons or hardcoded SVG path styling in React components; use `lucide-react` icons and semantic Tailwind classes.
- Do not add local `classNames`, `cn`, or wrapper helpers without a concrete repeated need.
- Do not use template literals only to append conditional classes.
- Do not add broad selectors or global CSS rules when component utility classes can express the behavior.
- Do not turn repeated class sets into broad design-system abstractions before reuse is real.
- Do not create generic interchangeable layouts that ignore the existing cube visualization tone.
- Do not let visual experiments break mobile usability or the 350px cube cap.

## Verification

- Search changed files for local class-name helpers, `rounded-`, new `.css` files, inline `<svg>` UI icons, hardcoded arbitrary hex color utilities, and raw hex colors outside `apps/web/src/index.css` before finishing.
- Run `npm run theme-colors:check` after changing theme tokens, Tailwind color classes, docs that mention color rules, or generated AI route content.
- Run `npm run build` after Tailwind or component style changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Check both system-default theme behavior and explicit `dark`/`light` theme behavior when theme code changes.
- Check mobile breakpoints for changed grids, forms, and visualization containers when feasible.
