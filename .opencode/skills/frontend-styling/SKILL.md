---
name: "frontend-styling"
description: "Use when changing Tailwind utilities, theme tokens, responsive layout, class composition, or visual treatment."
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../../ai/skills/frontend-styling.md`.

Referenced context:
- `../../../ai/rules/frontend-styling-rules.md`
- `../../../ai/rules/frontend-quality-rules.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-styling

## Canonical Skill: `ai/skills/frontend-styling.md`

# Frontend Styling

Use for Tailwind utilities, theme tokens, responsive layout, and visual treatment.

## Read First

- `ai/rules/frontend-styling-rules.md`
- `ai/rules/frontend-quality-rules.md`

## Workflow

- Follow nearby shadcn-compatible UI patterns and semantic tokens in the single CSS entrypoint.
- Use static class strings when possible, the existing `cn` helper for shared primitives/class merging, and established `classnames` usage in feature code when merge semantics are unnecessary.
- Check focus, reduced motion, themes, mobile layout, and visualization sizing.
- Run `npm run theme-colors:check`, web build, and lint.

# Referenced Context

## Reference: `ai/rules/frontend-styling-rules.md`

# Frontend Styling Rules

- Use Tailwind CSS v4 through `@tailwindcss/vite`; `apps/web/src/index.css` is the only CSS entry and owns resets, semantic variables, theme mappings, and minimal global animation definitions.
- Use semantic theme-backed classes. Raw hex values belong only in semantic variable definitions in `index.css`.
- Preserve the established shadcn-compatible visual language, including semantic tokens, subtle borders, rounded corners, and restrained shadows. Design changes still require a concrete product reason.
- Use plain class strings when static. Shared shadcn-style primitives and components that merge caller classes MUST use the existing `cn` helper; established feature code MAY continue to use `classnames` as `cls` when Tailwind conflict resolution is not needed.
- Preserve the established dark/gray visual tone, system theme behavior, mobile usability, visible focus, reduced motion, and the 350px cube cap.
- New CSS files, CSS-in-JS, Sass, hardcoded arbitrary colors, and broad selectors are prohibited.
- Run `npm run theme-colors:check`, web build, and lint after relevant changes; inspect mobile and theme variants when affected.

## Reference: `ai/rules/frontend-quality-rules.md`

# Frontend Quality Rules

Focused requirements for accessibility, performance, security, resilience, and dependencies in `apps/web`.

## Accessibility

- Interactive controls MUST have an accessible name, keyboard operation, visible focus, and correct native element or shared primitive semantics.
- Dialogs and sheets MUST preserve focus trapping, Escape handling, focus return, and labelled title/description behavior through existing primitives.
- Dynamic errors and completion states SHOULD use an appropriate live/status region without repeatedly announcing scanner frame updates.
- Motion MUST respect reduced-motion preferences; color MUST NOT be the only signal for scan, validation, timer, or solver status.

## Performance

- Indexable routes MUST retain SSG output and hydration; do not replace server-rendered content with client-only placeholders.
- Heavy visualization, algorithm, and page code SHOULD remain route- or feature-split. Avoid importing broad package barrels when a supported subpath exists.
- Supported Solver and Notation puzzle stages MUST automatically request their renderer. Solver visualizations MUST load no later than three seconds after mount; Notation visualizations MUST load automatically after their stage approaches the viewport. Clicking a preparing state MAY accelerate loading or retry an error, but MUST NEVER be required to see a visualization. Performance work MUST NOT defer any supported visualization behind an explicit click; tests MUST prove automatic loading for Solver and every supported Notation puzzle.
- Camera analysis MUST cancel stale work and avoid overlapping unbounded requests. Versioned assets remain immutable; mutable HTML and metadata MUST NOT receive immutable caching.
- Performance changes MUST use a concrete signal such as bundle output, request count, render behavior, or measured interaction, not speculative memoization.

## Security And Resilience

- Camera permission MUST follow a clear disclosure of purpose and processing. Once permission succeeds, scanner analysis starts automatically by default; users retain pause/exit and manual-review controls.
- Images and reviewed scan data MUST stay within typed scan contracts and configured request limits. Do not persist or transmit camera data beyond the disclosed solve workflow.
- Browser code MUST not weaken CSP, permissions policy, origin restrictions, request size limits, runtime response validation, or typed error handling.
- Async work MUST handle cancellation and stale responses. User-visible flows MUST expose recoverable API/camera failures and avoid silently fabricating successful data.
- Analytics, RUM, and error-tracking services are out of scope unless a separate product/privacy decision explicitly introduces them.

## Dependencies

- A new runtime dependency MUST solve a named current gap that existing React, browser APIs, shared primitives, or installed packages cannot reasonably solve.
- The change MUST identify bundle/runtime impact, maintenance owner, licensing/security fit, SSR/hydration compatibility when relevant, and focused tests.
- Do not add a package solely for a small helper, styling convention, or abstraction without a current reused consumer.
