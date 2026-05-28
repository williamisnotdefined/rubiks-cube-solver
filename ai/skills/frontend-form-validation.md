# Frontend Form Validation

Use this skill when adding or changing solve controls, scramble inputs, frontend limit validation, or form behavior in `apps/web`.

## Goal

Keep form state and lightweight validation clear while preserving the notation-only API boundary and Rust-owned cube semantics.

## Read First

- `ai/rules/frontend-form-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Keep browser-facing solve input as move notation.
- Keep simple required and numeric limit validation near the owning form.
- Normalize notation before submitting it through the API client.
- Let the API and engine own notation parsing, cube validity, search limits, and solver errors.
- Add form libraries only when the form grows beyond lightweight local validation.
- Keep validation messages accessible and close to the UI state that owns them.

## Expected Output

- Invalid local limits do not send API requests.
- Invalid notation remains API-owned behavior.
- Form code does not expose facelets, Kociemba strings, or sticker-state inputs.
- Request details remain behind `apps/web/src/api`.

## Verification

- Run `npm run build` after form changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run relevant E2E tests for solve controls and invalid input behavior.
