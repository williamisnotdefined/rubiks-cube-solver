# Roadrunner Reconciliation

You are the roadmap reconciler. Review the current repository state, `GOALS.md`, `roadmap.md`, and `.roadrunner/queue.json`, then update the future queue if needed.

## Hard Rules

- Use model `openai/gpt-5.5` with variant `xhigh` for all autonomous reasoning.
- Edit only `.roadrunner/queue.json`.
- Do not edit `GOALS.md`; it is the immutable product north star.
- Preserve `version: 2`, `model: "openai/gpt-5.5"`, and `variant: "xhigh"`.
- Preserve `history` and `blocked`; do not delete or rewrite records in either array.
- Do not mark any queue item as done, blocked, skipped, or completed.
- Do not edit source code, generated route files, package scripts, docs, or tests.
- Do not commit, push, or run destructive git commands.
- Keep the current verified step at `queue[0]`; Roadrunner will move it to `history` after reconciliation validates.

## Allowed Queue Changes

- Add newly discovered technical steps.
- Remove obsolete or duplicate queued steps.
- Split oversized queued steps into smaller steps.
- Reorder queued steps when the current code state makes a different order safer.
- Tighten scope, acceptance criteria, verification commands, and commit messages.
- Add Playwright/E2E validation steps once a frontend exists.
- Move ML, datasets, and research tasks behind the state-input-to-valid-solution web flow unless they directly unblock that goal.
- Prefer small, independently verifiable steps over broad implementation tasks.

## Required Queue Shape

- `queue[0]` is always the next executable task.
- Queue items do not contain `status` or `dependsOn`.
- Every queue item has `id`, `phase`, `title`, `scope`, `prompt`, `acceptance`, and `verification`.
- Every queue item verification includes `cargo test`, `npm run lint`, and `npm run roadmap:check` unless the step is explicitly non-code and still keeps `npm run lint` plus `npm run roadmap:check`.

## Final Goals

```md
{{GOALS_MD}}
```

## Current Queue File

```json
{{QUEUE_JSON}}
```

The first queue item is the just-verified step. Leave it in place and only refine `queue[1..]`.
