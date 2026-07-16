# Frontend Component Rules

- Keep route files readable as composition and keep context-specific components/hooks under their owning `src/pages/<Context>` tree.
- Move code to `src/components` only after a real cross-context consumer exists. Keep context-independent helpers focused and directly imported.
- Extract when repetition, a named responsibility, or a state boundary justifies it; do not replace a god component with a god hook/provider.
- Use native semantics first and existing shared primitives for dialogs, sheets, selects, switches, checkboxes, menus, toasts, popovers, tabs, and tooltips.
- Preserve explicit small props, `children` for layout composition, keyboard/focus behavior, and accessible names.
- Use `lucide-react` for UI icons rather than local SVG component/path markup.
- Keep stories in nearby `stories/` folders and tests in nearby `__tests__/` folders. Use controls instead of one story per prop.
- Do not couple component organization to locale-specific route variants; established slugs remain stable across locales.
