# Repository Hardening Audit

Captured: 2026-06-23.

Scope: local repository hardening plus read-only GitHub settings audit. No Rulesets, branch protection, secrets, environments, merge settings, or other remote GitHub configuration were changed.

## Architecture And Trust Boundaries

The repository is a Rust-first Rubik's Cube solver with these primary boundaries:

| Boundary | Current owner | Trust model |
| --- | --- | --- |
| Puzzle state, notation, validation, search, heuristics, pruning tables, and replay verification | `crates/cube-engine` | Authoritative; successful solutions must be replay verified before exposure. |
| HTTP API contracts, request limits, puzzle strategy selection, scanner handoff, and result mapping | `crates/api` | Adapter around Rust-owned solver behavior; must reject invalid inputs with typed errors. |
| Web visualization, solve forms, playback, scanner UI, algorithms pages, and timer flows | `web` and `packages/rubiks-cube` | Presentation and request orchestration only; no solver logic or validation authority. |
| Scanner runtime and training | `scanner` | YOLO/ONNX evidence pipeline only; scanner predictions are not proof of a valid cube state. |
| AI guidance routes | `ai` canonical files | Source of truth; generated `.opencode`, `.cursor`, and `.github/instructions` files are updated only by `npm run ai:sync`. |
| Runtime containers | `Dockerfile.app`, `Dockerfile.vision`, `docker-compose*.yml` | Local production-like deployment; generated pruning tables and scanner models stay local artifacts unless explicitly approved. |

## Existing CI Jobs, Check Names, Runtimes, And Gaps

Current workflow inventory before this hardening pass:

| Workflow | Job | Trigger | Runtime | Existing checks | Gaps |
| --- | --- | --- | --- | --- | --- |
| `CI` | `rust` | `push` to `main`/`autopilot/roadmap`, `pull_request` | `ubuntu-latest` | `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings` | No explicit permissions, concurrency, timeouts, immutable action SHAs, Cargo cache, or explicit workspace/all-targets test command. |
| `CI` | `node` | same | `ubuntu-latest` | `npm ci`, `npm run ai:check`, package checks, web lint/build/storybook | Web job ran tests without coverage; no timeout/concurrency/action pinning. |
| `CI` | `e2e-smoke` | same | `ubuntu-latest` | Playwright Chromium smoke suite | No failure artifact upload, timeout, action pinning, or explicit permissions. |

No dedicated scanner, dependency-review, CodeQL, container, Scorecard, SBOM, or release workflows existed before this pass.

Recommended stable required-check names after local workflow changes:

| Required check | Purpose |
| --- | --- |
| `rust` | Rust formatting, workspace tests, and Clippy warnings-as-errors. |
| `node` | AI routes, visualization package checks, web tests, lint, build, and Storybook. |
| `scanner` | Python scanner runtime/training tests plus Ruff, contract mypy, and practical coverage. |
| `docker` | Compose syntax and Docker image build checks. |
| `e2e-smoke` | Fast Playwright product/responsive/timer smoke coverage. |
| `dependency-review` | Pull request dependency vulnerability and license review. |
| `codeql` | CodeQL analysis for Rust, TypeScript/JavaScript, Python, and Actions workflows. |
| `scorecard` | Scheduled OpenSSF Scorecard supply-chain posture scan. |

## Current Branch, Ruleset, And Merge Settings

Read-only GitHub evidence is captured in `docs/audits/github-settings-before.json`.

Summary:

| Setting | Before |
| --- | --- |
| Default branch | `main` |
| Branch protection for `main` | Not configured (`404 Branch not protected`) |
| Repository Rulesets | None (`[]`) |
| Squash merge | Enabled |
| Merge commits | Enabled |
| Rebase merge | Enabled |
| Auto-merge | Disabled |
| Delete branch on merge | Disabled |
| Update branch button | Disabled |

Remote settings were not changed in this work because the operating rules for this task explicitly prohibit applying Rulesets, branch protection, or remote GitHub configuration changes.

## Existing GitHub Security Features

Read-only evidence from repository metadata:

| Feature | Before |
| --- | --- |
| Security policy | Disabled/no `SECURITY.md` detected by GitHub |
| Dependabot security updates | Disabled |
| Dependabot alerts API | Disabled or inaccessible until enabled |
| Secret scanning | Disabled |
| Secret scanning push protection | Disabled |
| Code scanning alerts | No analysis found |

## Dependency And Lockfile Strategy

| Ecosystem | Evidence | Current strategy | Gap |
| --- | --- | --- | --- |
| Rust | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` | Workspace lockfile exists; license metadata is MIT. | Toolchain was unconstrained `stable`; no advisory/license policy workflow. |
| Node | `package.json`, `package-lock.json`, workspaces | Root lockfile and `npm ci` are used. | No Dependabot config; no dependency-review workflow before this pass. |
| Python scanner | `scanner/runtime/requirements.txt`, `scanner/training/requirements.txt`, `scanner/requirements-test.txt` | Requirements files use lower bounds. | No lockfile or hash-pinned install; no Ruff/static type config before this pass. |
| GitHub Actions | `.github/workflows/ci.yml` | Actions were version-tagged. | Third-party actions were not pinned to immutable commit SHAs. |
| Docker | `Dockerfile.app`, `Dockerfile.vision`, `Dockerfile.trainer` | Base images use versioned tags. | Tags are not digest-pinned; no container scan workflow before this pass. |

## Test Inventory By Component

| Component | Current tests/checks |
| --- | --- |
| Rust engine/API | `cargo fmt --check`, `cargo test`, `cargo test -p cube-engine`, `cargo test -p rubiks-cube-solver-api`, `cargo clippy --all-targets --all-features -- -D warnings`. |
| Web app | `npm run test -w @rubiks-cube-solver/web`, `npm run test:coverage -w @rubiks-cube-solver/web`, `npm run lint -w @rubiks-cube-solver/web`, `npm run build`, Storybook build. |
| Visualization package | `npm run check`, `npm run lint`, `npm run build:types`, `npm run test:coverage` in `@rubiks-cube-solver/rubiks-cube`. |
| Scanner runtime/training | `npm run vision:test`, `npm run scanner:training:test`. |
| E2E | `npm run test:e2e:smoke`, `npm run test:e2e:scan`, `npm run test:e2e:full`, heavy scan suite opt-in. |
| Product gate | `npm run bootstrap:check`, `npm run product:gate`. |

## Coverage Gates By Component

| Component | Gate |
| --- | --- |
| Web app | Vitest coverage thresholds at 95% for branches, functions, lines, and statements in `web/vite.config.ts`. |
| Visualization package | Vitest coverage thresholds at 95% for branches, functions, lines, and statements in `packages/rubiks-cube/vitest.config.ts`. |
| Rust | No coverage threshold configured; correctness is enforced by tests and replay verification. |
| Scanner | `pyproject.toml` configures `pytest-cov` with branch coverage and a practical 60% starting threshold. |

## API Reliability And Abuse-Resistance Review

Positive evidence:

- API contracts are typed through Rust modules and scanner contract adapters.
- Request limits exist in API configuration and solve paths.
- README states every successful solve includes `replayVerified=true`.

Gaps:

- CPU-bound solve isolation, bounded worker concurrency, queue limits, and overload contracts need deeper API implementation work.
- Health semantics are still centered on `/health`; `/livez` and `/readyz` are not documented as separate readiness levels.
- Security headers, request IDs, structured JSON logs, body limits, and graceful shutdown should be expanded in a dedicated API PR.

## Solver Correctness And Performance Review

Positive evidence:

- Rust owns solver state, validation, strategies, pruning artifacts, and replay verification.
- Generated pruning tables are ignored and documented as local artifacts.
- Solver quality commands exist for real-scramble and short-scramble gates.

Gaps:

- Property tests and fuzz targets for parsers, facelets, artifact readers, and API JSON are not yet present.
- Performance trend artifacts and scheduled quality gates are not yet automated.
- Artifact manifest compatibility is present in code areas but should be audited against the full requested metadata list.

## Scanner, Model, And Data Lifecycle Review

Positive evidence:

- Runtime scanner is YOLO/ONNX-only and clearly separated from Rust validation/solve authority.
- Generated scanner models, private captures, local outputs, and training runs are ignored by git.
- Source Roboflow dataset is the explicit Git LFS exception.

Gaps:

- `scanner/MODEL_CARD.md`, `scanner/DATASET_CARD.md`, and `scanner/model-manifest.schema.json` were added in this pass.
- Runtime model compatibility checks should reject incompatible manifest/class/order/input/opset combinations once manifest loading is implemented.
- Scanner inference concurrency, timeouts, image size limits, and warm-readiness behavior need runtime hardening.

## Container And Deployment Security Review

Positive evidence:

- Local production Compose binds the app to `127.0.0.1:8787`.
- Scanner model mount is read-only in production Compose.
- Package manager caches are removed from apt layers.
- Runtime app and vision containers now run as non-root users.
- Production Compose drops Linux capabilities, sets `no-new-privileges`, uses read-only root filesystems, and mounts `/tmp` as tmpfs.

Gaps:

- Base images are version-tagged but not digest-pinned.
- No container vulnerability scan, SBOM, or attestation workflow existed before this pass.

## Documentation And Governance Review

Positive evidence:

- `README.md`, `docs/project-plan.md`, `docs/runtime.md`, and scanner runbooks document key boundaries and local commands.
- AI knowledge has a canonical route generation system.

Gaps:

- Repository governance files such as `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, templates, CODEOWNERS, ADRs, and threat model were missing before this pass.
- README badges should only be added after checks actually exist and are stable.

## Prioritized Findings

| Severity | Finding | Evidence | Risk | Recommended change | Status | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Critical | `main` is not protected | GitHub API returned `404 Branch not protected`; UI alert shown by user. | Direct pushes, force pushes, or deletion can bypass review and CI. | After checks run successfully, manually configure a `Protect main` Ruleset requiring PRs, required checks, conversation resolution, linear history, no force pushes, and no deletion. | Manual GitHub configuration required; not applied by this task. | `gh api repos/{owner}/{repo}/branches/main/protection` or Rulesets API after manual setup. |
| High | GitHub security features are disabled | `security_and_analysis` shows secret scanning, push protection, and Dependabot security updates disabled. | Vulnerable or secret-bearing changes may be missed until manual review. | Enable available GitHub security features and Dependabot alerts in repository settings. | Manual GitHub configuration required; not applied by this task. | GitHub repository security settings and API metadata. |
| High | CI actions were tag-pinned, not SHA-pinned | `.github/workflows/ci.yml` used `actions/checkout@v6`, `actions/setup-node@v6`, `dtolnay/rust-toolchain@stable`. | Mutable tags increase supply-chain risk. | Pin actions to full commit SHAs or replace unnecessary third-party actions with direct toolchain commands. | Planned in local CI hardening. | Workflow diff and future CI run. |
| High | Web CI did not enforce web coverage | CI used `npm run test -w @rubiks-cube-solver/web`; local `npm run test:coverage -w @rubiks-cube-solver/web` currently reports 93.55% statements, 88.42% branches, 94.14% functions, and 93.42% lines against 95% thresholds. | Coverage regressions could pass PR CI, but adding the gate now would create broken automation. | Add tests to bring web coverage above the existing 95% thresholds, then switch CI from web tests to web coverage. | Documented gap; not added as a required check in this pass. | `npm run test:coverage -w @rubiks-cube-solver/web` before enabling the gate. |
| High | No dedicated scanner CI job | Only scanner tests are included in bootstrap scripts, not in the GitHub workflow. | Scanner regressions can merge without runtime/training test coverage. | Add Python 3.11 scanner job for runtime and training tests plus lint/static checks. | Implemented locally with Ruff, contract mypy, runtime/training tests, and coverage. | `python -m ruff check scanner`, `python -m mypy`, `npm run vision:test`, `npm run scanner:training:test`, and `python -m pytest scanner/runtime scanner/training --cov=scanner --cov-report=term-missing`. |
| Medium | No dependency-review or Dependabot config | `.github/dependabot.yml` and dependency review workflow absent. | Dependency vulnerabilities and license regressions rely on ad hoc review. | Add Dependabot config and dependency-review workflow. | Planned in security hardening. | Workflow syntax and future PR check. |
| Medium | No CodeQL workflow | Code scanning API returned no analysis found. | Security issues in Rust, TypeScript, Python, or Actions may be missed. | Add CodeQL workflow with minimal permissions. | Planned in security hardening. | Future CodeQL run. |
| Medium | Containers lack runtime hardening | Compose/Dockerfiles do not define non-root runtime users or dropped capabilities. | Container escape blast radius is higher than necessary. | Add non-root users, read-only filesystems, dropped capabilities, resource limits, and scans in a focused build PR. | Documented follow-up. | Docker build and smoke tests after implementation. |
| Medium | Python dependencies are lower-bound requirements | Requirements files use `>=` and no lock strategy. | Non-reproducible scanner installs can fail unexpectedly. | Introduce a lock strategy such as `uv.lock` or hashed constraints after dependency review. | Documented follow-up. | Clean install from lockfile. |
| Low | Governance files were incomplete | No `SECURITY.md`, CODEOWNERS, templates, threat model, or ADRs before this pass. | Contributors lack clear review/security/reporting process. | Add governance docs and templates. | Planned in docs hardening. | File presence and review. |

## Manual GitHub Configuration Pending

These settings intentionally remain manual because this task prohibits remote configuration changes:

1. Enable GitHub secret scanning and push protection where available.
2. Enable Dependabot alerts and Dependabot security updates.
3. After the new checks have run successfully at least once, create a `Protect main` Ruleset targeting `main` with the exact check names listed above.
4. For a solo-maintainer repository, require pull requests but keep required human approvals at `0` until a second trusted reviewer exists.
5. Configure squash merge as the only merge method, enable auto-merge, enable delete-branch-on-merge, and enable update branch if desired.
6. Create a release tag Ruleset for `v*` that blocks deletion and non-fast-forward updates.
