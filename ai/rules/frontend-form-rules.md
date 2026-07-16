# Frontend Form Rules

- Keep notation solve input as move notation and trim it before submission. Rust/API owns notation semantics, cube validity, and safety enforcement.
- Use local controlled state for simple controls. React Hook Form and Zod MAY be used for a form whose coordination or schema complexity benefits from them; do not treat them as required setup.
- Keep field labels visible and associated, errors near their owner, `aria-invalid` on invalid fields, and API caps discoverable.
- Prevent requests for invalid local limits, but do not duplicate solver validation in React.
- Keep the default scramble empty; examples belong in placeholders or help content.
- Raw facelet/Kociemba input modes remain prohibited for notation forms. Reviewed stickers and manual corrections are allowed only inside typed scan-session workflows.
