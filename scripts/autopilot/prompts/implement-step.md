# Roadmap Autopilot Implementation Step

You are running unattended inside this repository. Implement exactly the roadmap step below.

## Hard Rules

- Use model `openai/gpt-5.5` with variant `xhigh` for all autonomous work.
- Do not ask the user questions.
- Do not commit, amend, push, create branches, or update `ai/roadmap/execution.json`.
- Do not skip tests or lower quality gates.
- Do not modify generated AI route files manually; edit canonical files under `ai` and run `npm run ai:sync` when needed.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --`.
- Keep changes scoped to the step unless a direct compile/test issue requires a minimal adjacent fix.

## Required Workflow

1. Inspect the current code and roadmap context.
2. Implement the smallest correct change for this step.
3. Add focused tests for every acceptance criterion that can be tested.
4. Run relevant local checks if feasible.
5. Stop after implementation and verification. The autopilot runner will run final verification, commit, push, and mark the step done.

## Roadmap Step

```json
{{STEP_JSON}}
```

## Repository Status

{{ROADMAP_STATUS}}
