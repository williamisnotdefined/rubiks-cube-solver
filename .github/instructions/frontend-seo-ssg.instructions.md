---
applyTo: "apps/web/src/seo/**/*.{ts,tsx},apps/web/src/main/**/*.{ts,tsx},apps/web/src/App/**/*.{ts,tsx},apps/web/src/i18n/locales/*.json,apps/web/public/{robots.txt,llms.txt,site.webmanifest,og-default.svg},apps/web/{index.html,vite.config.ts,package.json},scripts/seo/**/*.mjs,tests/e2e/language-routing.spec.ts,crates/api/src/{routes.rs,tests.rs},deploy/nginx/**/*"
---

Generated from `ai/registry.json`. Do not edit manually.

Canonical skill: `../../ai/skills/frontend-seo-ssg.md`.

Referenced context:
- `../../ai/rules/frontend-rules.md`
- `../../ai/rules/frontend-quality-rules.md`
- `../../ai/architecture/web-architecture.md`

This file is compiled from canonical AI knowledge files. Edit canonical files under `ai`, then run `npm run ai:sync`.

# Compiled AI Skill: frontend-seo-ssg

## Canonical Skill: `ai/skills/frontend-seo-ssg.md`

# Frontend SEO And SSG

Use for route manifests, locales, metadata, static generation, hydration, public SEO assets, and language-routing E2E.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/web-architecture.md`

## Workflow

- Update the route manifest as the shared source for routing, routable SSG paths, indexable sitemap paths, metadata, and alternates.
- Keep unprefixed `en-US`; publish each other locale only with complete visible and SEO translations.
- Preserve real React static rendering, `hydrateRoot`, and SPA navigation after hydration.
- Verify 200 responses for every routable path, `noindex` for incomplete paths, 404 only for unknown paths, generated HTML/assets, canonical/hreflang/JSON-LD parity, redirects/proxy behavior, build, and language-routing E2E.

# Referenced Context

## Reference: `ai/rules/frontend-rules.md`

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

## Verification

- Run web build, lint, and targeted tests for changed behavior.
- Run SSG/SEO and E2E checks when routing, locales, metadata, hydration, scanner, timer, or solve flows change.

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

## Reference: `ai/architecture/web-architecture.md`

# Web Architecture

`apps/web` is organized by bounded product contexts while sharing only stable infrastructure.

## Bounded Contexts

- `src/pages/<Context>` owns page composition, context-specific components, hooks, stores, and workflow helpers for solve/scan, timer, algorithms, notation, records, channels, and sites.
- `src/api/<domain>` owns transport adapters, runtime response validation, React Query operations, and domain API types. `src/api/client` owns shared HTTP mechanics.
- `src/components` owns primitives and layout with real cross-context consumers; it MUST NOT absorb page-specific workflow logic.
- `src/seo` owns the route manifest, locale-aware canonical metadata, alternates, JSON-LD, and indexability.
- `src/main` owns browser startup, runtime locale selection, static rendering entry, and hydration.
- `src/i18n/locales` owns visible copy. `public` owns copied static assets, not application behavior.
- `packages/rubiks-cube` owns browser visualization adapters; Rust remains authoritative for solving and cube validity.

Dependencies point inward from pages to shared components, API, and SEO infrastructure. Contexts SHOULD communicate through typed props, route state, or explicit shared contracts rather than importing another page's internals.

## SSG And Runtime

- Production build MUST statically render every routable route/locale pair with real React server rendering. Indexable routes additionally participate in sitemap and hreflang; valid but incomplete surfaces remain routable with `noindex` until complete.
- Browser startup MUST use `hydrateRoot` when static markup exists and `createRoot` only for a genuinely empty mount.
- After hydration, React Router provides SPA navigation; SSG is not a separate static-only implementation.
- Rendered HTML, canonical URL, `html lang`, title, description, hreflang alternates, and JSON-LD MUST agree for a route and locale.
- Unknown routes and valid non-indexable routes MUST remain `noindex`; valid non-indexable routes still return their application HTML with status 200. Unknown `/api/*` paths MUST never fall through to HTML.

## Locale Contract

- `en-US` is canonical and has no URL prefix. The other supported locales are `es`, `pt-BR`, `it`, `de`, `fr`, `ru`, `zh`, and `ja`.
- A locale MAY be published in navigation, alternates, sitemap, or generated SSG paths only when all user-visible and SEO content for that published surface is translated, with key and placeholder parity.
- Stable slugs are product identifiers and are not required to be English. Do not translate an established slug per locale; changing one requires redirect and canonical-link planning.

## Server Integration

- Axum serves versioned assets with immutable caching, known static route files, and a neutral non-hydrated `404.html` only for unknown web paths.
- `/` permanently redirects to the canonical solve route. `/api/wca-data` is an Axum 308 redirect to the WCA Data docs.
- Security headers are server-owned. Browser code MUST remain compatible with the configured CSP and permissions policy.
