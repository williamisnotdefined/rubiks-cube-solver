# Repository Rules

Global rules for changes anywhere in this repository.

## Always

- Read `roadmap.md`, nearby code, and current tests before changing behavior.
- Prefer the smallest correct change with the lowest surface area.
- Keep the implementation order aligned with the roadmap: cube representation, moves, search, heuristics, pattern databases, ML, then hybrid search.
- Keep solver logic in Rust engine code, not in frontend or AI tooling.
- Use cubie representation as the primary engine model.
- Run targeted verification for the affected area and report any environment blockers.
- Keep AI route files generated from canonical files under `ai`.

## Never

- Do not start with machine learning, reinforcement learning, or Transformers.
- Do not use sticker/color arrays as the primary solver representation.
- Do not mix UI rendering logic with cube engine logic.
- Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` AI route files manually.
- Do not add compatibility layers or future abstractions without a concrete current consumer.

## Verification

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: `cargo test` when Rust is installed.
- Broad repository changes: run all available targeted checks.
