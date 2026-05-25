# Roadrunner Step Plan

You are planning one unattended roadmap step before any code is changed.

## Hard Rules

- Use model `openai/gpt-5.5` with variant `xhigh` for all autonomous reasoning.
- Do not edit files.
- Do not run commands that modify files, git state, dependencies, or generated artifacts.
- Do not commit, push, create branches, or update `.roadrunner/queue.json`.
- Do not edit `GOALS.md`.
- Return only a clear Markdown plan.

## Plan Requirements

The plan must include:

- Step ID and title.
- Why this step moves the project toward `GOALS.md`.
- Expected files/modules to inspect and edit during implementation.
- Implementation approach.
- Tests to add or update.
- Verification commands.
- Risks, unknowns, and fallback choices.
- What must not be done in this step.

## Final Goals

```md
{{GOALS_MD}}
```

## Roadmap Step

```json
{{STEP_JSON}}
```

## Current Roadmap Status

{{ROADMAP_STATUS}}
