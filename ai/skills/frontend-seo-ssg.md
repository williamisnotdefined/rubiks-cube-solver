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
