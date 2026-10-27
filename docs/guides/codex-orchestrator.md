# Codex autonomous development loop

The repository stores autonomous development state in `.ai-kit/` and uses the
existing ai-kit task and gate conventions.

## Commands

```text
npm run orchestrator:status
npm run orchestrator:plan
npm run orchestrator:pilot
npm run orchestrator:run
npm run orchestrator:run -- --task=P0-001
```

`status`, `plan`, and `pilot` are read-only. `pilot` selects the next ready
task and reports whether it can run unattended.

`run` delegates only a planned, low-risk task to Codex in an isolated detached
worktree. The worker receives the repository rules, task paths, and validation
commands. The orchestrator records the run and stops at review-required work.

The orchestrator does not merge, push, deploy, apply migrations, reset hosted
fixtures, activate the scheduler, or use Production credentials.

## State

- `.ai-kit/orchestrator.json` is the task registry.
- `.ai-kit/orchestrator-state.json` is the continuation state.
- `.ai-kit/runs/` contains local worker logs and is ignored by Git.

Task status is durable. A later session can run `orchestrator:status` or
`orchestrator:plan` and continue from the stored state.

## Review gates

Any task that touches Auth, roles, RLS/RPCs, migrations, funding, payments,
verification, deletion, scheduler, deep links, deployment, or environment
configuration requires owner or security review. The orchestrator records
`review_required` and stops.

The smallest unattended unit is one task and one worker attempt. The default
retry budget is one attempt. The worker must stop when the task needs a missing
product decision or an external environment.
