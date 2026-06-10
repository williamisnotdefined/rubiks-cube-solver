# Repository Rules

Global rules for changes anywhere in this repository.

## Always

- Read `roadmap.md`, nearby code, and current tests before changing behavior.
- Prefer the smallest correct change with the lowest surface area.
- Follow existing naming, file layout, import style, error handling, and command style before introducing a new pattern.
- Keep the implementation order aligned with the roadmap: cube representation, moves, search, heuristics, pattern databases, ML, then hybrid search.
- Keep solver logic in Rust engine code, not in frontend or AI tooling.
- Use cubie representation as the primary engine model.
- Keep workspace-specific code inside the owning workspace unless there is a current cross-workspace consumer.
- Use repository-root commands such as `npm run ai:check`, `npm run api:test`, `npm run build`, and `cargo test` so paths and workspaces resolve consistently.
- For `web`, use Biome through workspace scripts for linting and formatting; do not add ESLint or Prettier configs unless explicitly requested.
- Run targeted verification for the affected area and report any environment blockers.
- Before any AI-created commit or pull request, run `cargo clippy --all-targets --all-features -- -D warnings` from the repository root when the Rust toolchain is available.
- Keep AI route files generated from canonical files under `ai`.

## Never

- Do not start with machine learning, reinforcement learning, or Transformers.
- Do not use sticker/color arrays as the primary solver representation.
- Do not mix UI rendering logic with cube engine logic.
- Do not commit `.env` files, raw secrets, API tokens, model artifacts with private data, or local solver output that is not intended for source control.
- Do not edit `.opencode/skills`, `.cursor/rules`, or `.github/instructions` AI route files manually.
- Do not add compatibility layers or future abstractions without a concrete current consumer.
- Do not add a new formatter, linter, framework, or workspace-wide tool unless explicitly requested.

## Verification

- AI knowledge changes: `npm run ai:check`.
- Rust engine changes: run the narrowest relevant `cargo test` first, then `cargo test -p cube-engine` or `cargo test` when Rust is installed.
- API changes: `npm run api:test` or the relevant `cargo test -p rubiks-cube-solver-api` target.
- Web changes: `npm run build` and `npm run lint -w @rubiks-cube-solver/web` when dependencies are installed.
- Broad repository changes: run affected targeted checks first, then broader checks only when the change crosses boundaries.
- Commit and PR requests: run `cargo clippy --all-targets --all-features -- -D warnings` before committing, pushing, or opening/updating the PR, or report the environment blocker if it cannot run.
