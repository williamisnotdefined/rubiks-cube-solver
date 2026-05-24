# Roadmap Autopilot Failure Fix

The previous attempt for this roadmap step failed verification. Fix the failure with the smallest correct change.

## Hard Rules

- Use model `openai/gpt-5.5` with variant `xhigh` for all autonomous work.
- Do not ask the user questions.
- Do not commit, amend, push, create branches, or update `ai/roadmap/queue.json`.
- Do not edit `GOALS.md`.
- Do not skip tests or lower quality gates.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --`.
- Focus on the failure output. Avoid unrelated refactors.
- Use the saved execution plan as context, but prioritize fixing the verification failure.

## Roadmap Step

```json
{{STEP_JSON}}
```

## Final Goals

```md
{{GOALS_MD}}
```

## Saved Execution Plan

```md
{{PLAN_MD}}
```

## Attempt

{{ATTEMPT}}

## Failure Output

```txt
{{LAST_FAILURE}}
```
