# Frontend Visualization Architecture

The frontend renders solver interaction, scan workflows, notation pages, algorithms pages, timer flows, and visualization playback. It must not become the source of truth for puzzle logic.

## Boundary

- The Rust HTTP API and `cube-engine` own solver behavior, puzzle validation, search, heuristics, and replay verification.
- `apps/web/src/api` owns HTTP request details, response normalization, typed results, API base URL handling, and API error mapping.
- React components own user interaction, form controls, loading indicators, result display, visualization playback, and local UI state.
- `@rubiks-cube-solver/rubiks-cube` is a private visualization package and adapter surface, not the solver core.
- Facelet, Kociemba, sticker-state, and visual-state strings are adapter details. Typed scan-session requests MAY carry reviewed stickers and manual overrides; notation solve forms MUST NOT expose raw state input.

## Data Flow

```txt
React page/component
        -> apps/web/src/api request or React Query hook
        -> Rust HTTP API
        -> cube-engine solve or scan contract
        -> normalized API result
        -> visualization adapter / playback UI
```

API load state, solve result state, form state, scan workflow state, and visualization playback state should remain separately owned unless a focused page-level owner explicitly coordinates them.

## Visualization State

- Supported visual-state kinds come from API and puzzle contracts, such as `cube3-facelets-v1`, `cube2-facelets-v1`, or `none`.
- Visualization hooks may parse supported move tokens to animate or set renderer state, but Rust remains authoritative for notation semantics and puzzle validity.
- Imperative custom-element synchronization belongs in focused visualization hooks and refs, not broad page effects.
- A supported Solver visualization requests its renderer automatically no later than three seconds after the page mounts. Solver input or a solve result may request it sooner; clicking the preparing state is an optional acceleration or retry path, never a prerequisite for seeing the cube.
- Every supported Notation visualization requests its renderer automatically when its stage approaches the viewport. Clicking a preparing state or a notation action is an optional acceleration or retry path, never a prerequisite for using the visualization.
- Performance changes MUST preserve this automatic visualization loading behavior; click-only renderer loading is prohibited.
- Selection and playback state should be represented by IDs, move indexes, notation strings, or small status values instead of duplicated puzzle objects when possible.
- The visible cube should remain within the established 350px by 350px UI constraint unless the design is intentionally changed.

## Current Frontend Stack

- Vite, React, TypeScript, React Router, React Query, Zustand, Tailwind CSS v4, shadcn/Radix-backed shared primitives, `cn`, established `classnames` usage, `react-i18next`, Motion, Vitest, Storybook, and Playwright are active.
- React Hook Form and Zod are installed dependencies, not a mandatory project-wide form setup. Use them only where nearby code or schema complexity justifies them.
- `@rubiks-cube-solver/rubiks-cube` is already active through puzzle-specific subpath imports and Vite aliases.
- Additional dependencies require a specific current gap, an identified owner, and focused verification.
