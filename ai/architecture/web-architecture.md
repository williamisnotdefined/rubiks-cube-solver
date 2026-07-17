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
- Legacy `/algoritmos` route prefixes permanently redirect to the matching canonical `/algorithms` path, including locale-prefixed paths and query strings.
- Security headers are server-owned. Browser code MUST remain compatible with the configured CSP and permissions policy.
