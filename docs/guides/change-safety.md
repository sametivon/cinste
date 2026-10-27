# Changed-path and migration safety gates

Use `npm run safety:gate -- ...` from the repository root. The gate does not
merge, push, deploy, connect to a database, or approve a live action. It stores
no task state. Hermes Kanban remains the only task-state authority.

## Task contract

Before delegation, save an operator-approved JSON contract outside the worktree.
Use exact repository-relative file names. A directory scope must end with `/`.
Do not use absolute paths, `..`, backslashes, or glob patterns.

```json
{
  "action": "development",
  "paths": ["lib/auth-routing.ts", "tests/auth-routing.test.ts"]
}
```

Only `development` is allowed. Stop for Production deployment, live database
application, real financial transactions, irreversible external actions, or a
missing product decision. Do not add a human gate for security-sensitive
local development.

## Before delegation

```text
npm run safety:gate -- delegate --contract <ABSOLUTE_CONTRACT_PATH>
```

Copy the contract and classification into the task. All tasks require automated
review. The category list detects migration, RLS, RPC, Auth, payment, scheduler,
deletion, deep-link, and safety-control paths. A broad directory can contain
future sensitive files. An empty category list does not exempt a task from
review. The report always sets `mergeReady` to false.

## During development

Use the target commit recorded when the task starts. The base must exist and
must be an ancestor of HEAD. Missing history is an error, not an empty diff.

```text
npm run safety:gate -- check --base <TARGET_COMMIT> --contract <ABSOLUTE_CONTRACT_PATH>
```

The check includes committed changes since the base, staged changes, unstaged
changes, and untracked non-ignored files. It reads base, index, and worktree
content. Deleted sensitive code and renamed paths remain visible. Every changed
path must match the contract. A scope such as `lib/` does not permit `library/`.
Symlink paths and non-file changes fail closed. Before change inspection, the
gate rejects every tracked `assume-unchanged` or `skip-worktree` index entry,
including unchanged files and files outside the contract. These flags can hide
worktree edits from Git diff and status. The gate reports the affected path and
does not clear or alter index flags. The operator must resolve the flagged entry
and run the gate again. Sparse checkouts that use `skip-worktree` are not supported.

Historical migrations at the base are immutable. Edits, deletion, renames, and
index-only edits fail. New migrations must use the next unique four-digit
number and a lowercase underscore name, for example `0038_next_change.sql`.
Gaps and duplicate numbers fail. No migration is applied by this check.

## Before merge

Commit the validated changes. Require a clean worktree. Then run:

```text
npm run safety:gate -- merge --base <TARGET_COMMIT> --contract <ABSOLUTE_CONTRACT_PATH>
```

The merge gate checks scope and migrations, then runs these fixed local commands:

```text
npm run test:change-safety
npm run typecheck
npm test
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
npm run test:scheduler
npm run test:provisioning
npm run test:funding
npm run test:native-giver-bff
```

The database tests use disposable PGlite databases. These commands are not hosted
integration runners. The child environment excludes hosted credentials and
Node runtime injection variables. Each command has a five-minute timeout.
A nonzero exit, process error, changed HEAD, or dirty tree denies readiness.
After every command, including a failed command, the gate inspects index flags
and repository changes again. A newly set index flag denies readiness before
another validation command can run.
The result records the exact base, HEAD, categories, and successful commands.
A readiness report applies only to that base and HEAD. Run it again after either
commit changes. Do not use a check/delegate/audit report as merge evidence.

Attach the command output and automated security-review findings to the Kanban
handoff. The gate does not replace code review, locked product decisions,
physical-device acceptance, or hosted validation. Category matching is a
conservative heuristic, not a proof of code safety. Tests and package scripts
are trusted repository code; this tool is not an execution sandbox. Review
changes to the gate, CI, tests, and package scripts as safety-control changes.

## CI

The read-only `safety` job runs the gate regression tests and disposable-database
security suites. `audit --base <TARGET_COMMIT>` checks actual changed paths and
migration invariants without a task contract. It explicitly reports
`scopeChecked: false` and never reports merge readiness. PR checks use the PR
base SHA. Main pushes use the previous SHA. A missing base or non-ancestor base
fails closed. A first push with an all-zero previous SHA requires a valid base
before it can pass.

CI does not know the approved task scope. The coordinator must still run
`check` and `merge` with the approved contract. Require the safety, web, and
mobile jobs in branch protection before treating CI as enforced merge policy.
This local-only task does not configure branch protection or prove hosted CI.

For migration handoffs, state repository, pushed, hosted development/QA,
validation, Production, and scheduler active/inactive evidence separately.
