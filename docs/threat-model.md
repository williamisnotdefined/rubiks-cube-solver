# Threat Model

## Assets

| Asset | Protection goal |
| --- | --- |
| Solver correctness | Never return an invalid successful solution. |
| Puzzle state validation | Reject impossible states with typed errors. |
| Generated pruning artifacts | Reject incompatible or corrupt artifacts before search. |
| Scanner images and model outputs | Avoid persistence or logging of private user content by default. |
| Repository automation | Prevent unreviewed or unchecked changes from reaching `main`. |
| Secrets and environments | Never expose secrets to untrusted code or commit local `.env` files. |

## Primary Threats

| Threat | Risk | Mitigation |
| --- | --- | --- |
| Direct push to `main` | Bypasses review and CI. | Manually configure a `Protect main` Ruleset after checks exist and pass. |
| Invalid solver success | User receives unsafe or false solution. | Rust replay verification must gate every successful solve. |
| Scanner false accept | Model output could be mistaken for valid cube state. | Treat scanner as evidence only; reviewed stickers still go through Rust validation. |
| CPU exhaustion | Expensive solve requests can starve API workers. | Add bounded blocking worker pool, queue limits, timeouts, and overload responses in API hardening. |
| Supply-chain compromise | Mutable actions or vulnerable dependencies enter CI/runtime. | Pin actions by SHA, add Dependabot, Dependency Review, CodeQL, and Scorecard. |
| Artifact poisoning | Wrong or corrupt pruning tables alter search behavior. | Validate artifact metadata, checksum, puzzle, encoding, metric, and coordinate profile before use. |
| Private data leakage | Camera frames or local captures leak through logs/artifacts. | Keep captures, models, generated datasets, and logs ignored; avoid telemetry containing user content. |

## Manual GitHub Controls Still Required

- Enable secret scanning and push protection where available.
- Enable Dependabot alerts and security updates.
- Configure `Protect main` with required checks after the checks complete successfully at least once.
- Configure a `v*` release tag Ruleset before publishing releases.
