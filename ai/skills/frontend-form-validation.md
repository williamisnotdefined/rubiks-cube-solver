# Frontend Form Validation

Use for solve controls, inputs, local limits, scanner review controls, and form submission behavior.

## Read First

- `ai/rules/frontend-form-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/api-boundary.md`

## Workflow

- Separate lightweight UX validation from API/engine semantics.
- Choose local state or existing RHF/Zod usage based on the actual form, not a mandatory setup.
- Keep notation forms raw-state-free and scan corrections inside typed scan sessions.
- Verify accessible errors, blocked invalid requests, API outcomes, and relevant E2E behavior.
