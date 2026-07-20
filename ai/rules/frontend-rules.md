# Frontend Rules

## Boundaries

- Keep solving, notation semantics, puzzle validity, and replay verification in Rust. React renders and coordinates typed product workflows.
- Keep HTTP mechanics and normalization in `apps/web/src/api`; UI consumes domain hooks/adapters.
- Typed scan-session contracts MAY contain reviewed stickers, confidence, and manual overrides. Notation solve UI MUST NOT expose facelet, Kociemba, or raw cube-state inputs.
- Keep API load, form, page workflow, solve result, scanner review, and visualization playback state separately owned unless a focused page owner coordinates them.
- Use the active `@rubiks-cube-solver/rubiks-cube` package as a visualization adapter, never as canonical solver state.

## Web Runtime And Locales

- Preserve static rendering for indexable routes, `hydrateRoot` for generated markup, and SPA navigation after hydration.
- Keep `en-US` canonical without a prefix. Publish/index any of the nine supported locales only when its visible and SEO content is fully translated with placeholder parity.
- Treat route slugs as stable identifiers. They need not be English and MUST NOT vary by locale; slug changes require redirects and canonical planning.
- Keep route/page code in its bounded context and shared code behind a demonstrated cross-context consumer.

## Existing Patterns

- Prefer local state first, React Query for server state, and existing scoped Zustand stores only for genuinely shared client state.
- Use existing Radix-backed primitives for complex interaction semantics. Use the shared `cn` helper in shadcn-style primitives and established `classnames` as `cls` in feature code when Tailwind conflict resolution is unnecessary.
- React Hook Form and Zod MAY be used when nearby code or form/schema complexity warrants them; they are not mandatory setup.
- New dependencies require the concrete checks in `frontend-quality-rules.md`.

## React Compiler

- `apps/web` uses React 19 with React Compiler enabled through the Vite React compiler preset. Write ordinary components and hooks and let the compiler provide memoization.
- Do not add `useMemo`, `useCallback`, `React.memo`, or other manual render memoization. Do not make referential identity a correctness requirement for effects, subscriptions, or child props.
- Do not use `forwardRef`. React 19 components accept `ref` as a prop; type DOM-forwarding components with `ComponentPropsWithRef` and pass that prop to the owning element. A deliberate non-DOM imperative handle MAY use that prop with `useImperativeHandle`.
- Use `useEffectEvent` when a callback registered by an effect must read the latest props or state without re-subscribing. Keep effect dependencies focused on the values that define the subscription lifecycle.
- Keep derived values and event callbacks as ordinary render-time code. Preserve no legacy memoization solely because it existed before the compiler.
- Do not read from or write to mutable refs during render, except for one-time initialization that React explicitly permits. Put imperative ref synchronization in effects or event handlers.
- Compiler skips unsafe functions rather than changing behavior. Fix Rules of React violations instead of adding blanket opt-outs; use `"use no memo"` only as a short-lived, documented containment for a verified compiler issue.

## Verification

- Run web build, lint, and targeted tests for changed behavior. Web lint runs Biome plus the official React Hooks/Compiler diagnostics and rejects manual memoization imports.
- Treat `npm run build` as the compiler integration check because it exercises both the client bundle and the SSG build.
- Run SSG/SEO and E2E checks when routing, locales, metadata, hydration, scanner, timer, or solve flows change.
