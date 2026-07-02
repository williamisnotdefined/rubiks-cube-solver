# Frontend Form Validation

Use this skill when adding or changing solve controls, scramble inputs, frontend limit validation, or form behavior in `apps/web`.

## Goal

Keep form state and lightweight validation clear while preserving Rust-owned puzzle semantics and API-owned validation.

## Read First

- `ai/rules/frontend-form-rules.md`
- `ai/rules/frontend-component-rules.md`
- `ai/rules/frontend-state-rules.md`
- `ai/rules/api-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Keep notation solve input as move notation.
- Keep the default scramble empty so the cube starts solved; place sample scrambles in placeholders or examples.
- Use the existing React Hook Form and Zod setup for solve-form required and numeric limit validation.
- Keep simpler form-like controls local when RHF/Zod would add indirection without value.
- Normalize notation before submitting it through the API client.
- Let the API and engine own notation parsing, cube validity, search limits, and solver errors.
- Do not add another form or validation library while RHF/Zod cover the current form need.
- Keep validation messages accessible and close to the UI state that owns them.

## Expected Output

- Invalid local limits do not send API requests.
- Empty default scramble keeps solve disabled and visualization solved.
- Invalid notation remains API-owned behavior.
- Form code does not expose facelets, Kociemba strings, or sticker-state inputs.
- Request details remain behind `apps/web/src/api`.

## Verification

- Run `npm run build` after form changes.
- Run `npm run lint -w @rubiks-cube-solver/web` after frontend code changes.
- Run relevant E2E tests for solve controls and invalid input behavior.
