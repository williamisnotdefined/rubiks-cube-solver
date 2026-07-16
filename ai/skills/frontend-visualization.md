# Frontend Visualization

Use for cube rendering, playback, visualization adapters, or scan visualization.

## Read First

- `ai/rules/frontend-rules.md`
- `ai/rules/frontend-quality-rules.md`
- `ai/architecture/frontend-visualization.md`
- `ai/architecture/rubiks-cube-visualization-package.md`

## Workflow

- Identify the owning puzzle/page context and preserve the Rust solver boundary.
- Use the active package's narrow puzzle subpath; keep imperative rendering sync in focused hooks/refs.
- Keep scanner evidence and reviewed stickers in typed scan contracts, with disclosure before camera permission and automatic analysis after permission.
- Verify rendering, cancellation, accessibility, reduced motion, mobile sizing, and the relevant solve/scan E2E flow.
