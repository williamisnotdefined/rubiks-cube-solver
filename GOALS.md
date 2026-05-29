# Project Goals

This file is the product north star.

## Final Product Goal

Build a web interface where a user can input a valid 3x3 Rubik's Cube state and receive the shortest practical verified solution the configured solver portfolio can find within explicit limits.

The project is method-agnostic: two-phase search, bounded optimal search, pattern databases, solver portfolios, external classical algorithms, ML-assisted ordering, or hybrid search are all acceptable implementation paths when they preserve validation, configured limits, and replay verification.

## Required Capabilities

- Accept a user-provided 3x3 cube state through a web UI.
- Validate color counts, piece validity, orientation, permutation, and parity before solving.
- Convert user-facing facelets or stickers into the Rust cubie representation.
- Solve valid states with Rust solver logic exposed through the native HTTP API.
- Return a move sequence that is verified to solve the submitted state.
- Prefer the shortest verified solution available within the configured budget; treat 20 moves as a practical milestone and `<=16` as a quality target for states and budgets where that is feasible, while reporting honestly when a configured limit is not met.
- Display the solution as notation and support playback/visual verification in the UI.
- Let automated tests, including Playwright when the frontend exists, submit known states, receive solutions, replay them, and verify the cube is solved.

## Product Priorities

1. Correctness: never return an invalid solution.
2. Validity: reject impossible cube states with useful errors.
3. Solver usefulness: support real user-provided states, not only generated scrambles.
4. Solution quality: minimize verified solution length after correctness is established, with 20 moves as a practical milestone rather than a fixed method or ceiling.
5. Web delivery: expose the solver locally through the native HTTP API and a usable frontend.
6. Research extensions: datasets, ML, and hybrid search come after the web solve flow works.

## Non-Goals Until The Core Flow Works

- Do not prioritize ML before a working `state -> solution` web flow.
- Do not prioritize visual polish before state input, validation, solve, and solution verification work.
- Do not claim optimality, `<=16`, or a 20-move guarantee unless tests and solver design support that claim.
- Do not treat any specific solving method as the product goal; methods are interchangeable as long as the returned moves are valid, verified, and honestly reported.
- Do not make frontend code the source of truth for cube logic.
