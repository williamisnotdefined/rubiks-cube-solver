# Frontend Form Rules

Rules for forms and local validation in `web`.

## Always

- Keep notation solve forms on move notation.
- Use the existing React Hook Form and Zod setup for solve controls that need schema validation or coordinated submission shaping.
- Keep simpler form-like controls in lightweight local state when RHF/Zod would add indirection without value.
- Keep local validation near the owning form when it only validates simple limits or required values.
- Normalize move notation with `trim()` before API submission.
- Keep field labels explicit and accessible through visible text.
- Display validation messages through the page result or field-owned message region that currently owns the UX.
- Keep API safety caps visible or discoverable in the form controls that enforce them.
- Use `aria-invalid` when a specific field is invalid and the UI exposes field-level invalidity.
- Keep the default scramble input empty so the cube starts solved; sample scrambles belong in placeholders or examples, not initial form state.

## Never

- Do not expose facelet, Kociemba, sticker-state, or raw cube-state input modes in browser UI.
- Do not submit facelet or sticker-state payloads from the browser.
- Do not rely on browser validation for app-level solver messages.
- Do not add another form or validation library while React Hook Form and Zod cover the current form need.
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
- Check the empty default scramble keeps solve disabled and the visualization solved.
- Run `npm run build` and relevant E2E tests after form behavior changes.
