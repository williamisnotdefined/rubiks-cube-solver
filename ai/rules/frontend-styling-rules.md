# Frontend Styling Rules

- Use Tailwind CSS v4 through `@tailwindcss/vite`; `apps/web/src/index.css` is the only CSS entry and owns resets, semantic variables, theme mappings, and minimal global animation definitions.
- Use semantic theme-backed classes. Raw hex values belong only in semantic variable definitions in `index.css`.
- Preserve the established shadcn-compatible visual language, including semantic tokens, subtle borders, rounded corners, and restrained shadows. Design changes still require a concrete product reason.
- Use plain class strings when static. Shared shadcn-style primitives and components that merge caller classes MUST use the existing `cn` helper; established feature code MAY continue to use `classnames` as `cls` when Tailwind conflict resolution is not needed.
- Preserve the established dark/gray visual tone, system theme behavior, mobile usability, visible focus, reduced motion, and the 350px cube cap.
- New CSS files, CSS-in-JS, Sass, hardcoded arbitrary colors, and broad selectors are prohibited.
- Run `npm run theme-colors:check`, web build, and lint after relevant changes; inspect mobile and theme variants when affected.
