# Solver Search Rules

Rules for search, heuristics, and pattern database work.

## Always

- Keep search algorithms in `crates/cube-engine/src/search` unless a later crate boundary is introduced.
- Keep heuristics explicit about admissibility.
- Prefer bounded IDA* and generated two-phase paths after move tables are correct.
- Prune inverse moves and repeated same-axis branches where correctness allows it.
- Measure node counts and depth limits for non-trivial search changes.

## Never

- Do not depend on brute force as the final strategy.
- Do not mix pattern database generation with runtime search unless the boundary is explicit.
- Do not add learned or external-inference heuristics without an explicit current product requirement.
- Do not claim optimality unless the heuristic and search mode guarantee it.

## Verification

- Test solved states return an empty solution.
- Test shallow scrambles with known inverse solutions.
- Test heuristic lower bounds on solved and simple states.
