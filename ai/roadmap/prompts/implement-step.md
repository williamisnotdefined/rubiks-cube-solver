# Roadrunner Implementation Step

You are running unattended inside this repository. Implement exactly the roadmap step below.

## Hard Rules

- Use model `openai/gpt-5.5` with variant `xhigh` for all autonomous work.
- Do not ask the user questions.
- Do not commit, amend, push, create branches, or update `ai/roadmap/queue.json`.
- Do not edit `GOALS.md`.
- Do not run roadmap reconciliation; Roadrunner performs that after implementation verification.
- Do not skip tests or lower quality gates.
- Do not modify generated AI route files manually; edit canonical files under `ai` and run `npm run ai:sync` when needed.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --`.
- Keep changes scoped to the step unless a direct compile/test issue requires a minimal adjacent fix.
- Follow the saved execution plan. If implementation discovers the plan is wrong, make the smallest safe deviation and mention it in the final output.

## Required Workflow

1. Inspect the current code and roadmap context.
2. Compare the step against `GOALS.md` and keep the implementation aligned with the final product goal.
3. Implement the smallest correct change for this step.
4. Add focused tests for every acceptance criterion that can be tested.
5. Run relevant local checks if feasible.
6. Stop after implementation and verification. Roadrunner will run final verification, reconcile the future queue, and move the verified step from `queue` to `history`. Commits are created manually outside implementation agents after review.

## Final Goals

```md
{{GOALS_MD}}
```

## Roadmap Step

```json
{{STEP_JSON}}
```

## Saved Execution Plan

```md
{{PLAN_MD}}
```

## Repository Status

{{ROADMAP_STATUS}}
