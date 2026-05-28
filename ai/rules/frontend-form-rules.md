# Frontend Form Rules

Rules for forms and local validation in `apps/web`.

## Always

- Keep the browser-facing solve flow notation-only.
- Keep simple solve controls in lightweight local state unless complexity justifies a form library.
- Keep local validation near the owning form when it only validates simple limits or required values.
- Normalize move notation with `trim()` before API submission.
- Keep field labels explicit and accessible through visible text.
- Display validation messages through the page result or field-owned message region that currently owns the UX.
- Keep API safety caps visible or discoverable in the form controls that enforce them.
- Use `aria-invalid` when a specific field is invalid and the UI exposes field-level invalidity.

## Never

- Do not expose facelet, Kociemba, sticker-state, or raw cube-state input modes in browser UI.
- Do not submit facelet or sticker-state payloads from the browser.
- Do not rely on browser validation for app-level solver messages.
- Do not add React Hook Form, Zod, or another form library until current form complexity needs schema validation, many fields, or reusable validation.
- Do not duplicate API validation in the frontend beyond lightweight UX checks.
- Do not parse or validate cube solvability in React components.

## Boundaries

- The form owns user-entered notation and limit inputs.
- The API client owns request construction and response normalization.
- The Rust API and engine own notation semantics, cube validity, solver correctness, and safety enforcement.
- Visualization hooks may parse supported move tokens only to drive rendering, not to validate solver correctness.

## Verification

- Check invalid local limits do not send API requests.
- Check invalid notation still returns API-owned errors.
- Run `npm run build` and relevant E2E tests after form behavior changes.
