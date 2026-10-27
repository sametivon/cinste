# Hermes autonomous development for CINSTE

Hermes is the only live autonomous task coordinator for CINSTE.

Hermes Kanban stores the task queue, dependencies, worker claims, retries,
comments, and completion evidence. The active board is `cinste`. The board is
stored in the Hermes user data directory, not in the repository.

The repository file `.ai-kit/orchestrator.json` is a seed manifest. It stores
task descriptions and safety metadata. It does not store task status.

## Windows setup

The official installer places Hermes at:

```text
C:\Users\Sam\AppData\Local\hermes\bin\hermes.exe
```

Open a new PowerShell session after installation so the user PATH refreshes.
If the command is not available, use the full path above.

Authenticate one provider before a worker can run. Use the Hermes model picker.

```powershell
hermes model
```

Select the OpenAI Codex subscription when it is available. Hermes uses the
Codex App-Server runtime for OpenAI Codex models.

## Start and inspect

Run these commands from the CINSTE repository:

```powershell
hermes kanban boards use cinste
hermes kanban stats
hermes kanban list
hermes doctor
```

Start the gateway only when autonomous execution is approved:

```powershell
hermes gateway run
```

The gateway dispatcher runs ready tasks. The current CINSTE safety cap allows
one running task and one worker attempt per task. The failure circuit breaker
blocks a task after two consecutive failures.

## Task rules

Before delegation, run the development path contract through
`npm run safety:gate -- delegate --contract <ABSOLUTE_CONTRACT_PATH>`.
Include the approved contract and the report in the card. During development,
run `check` against the recorded target commit. Before an authorized merge,
require the clean-commit `merge` gate and its validation output. The gate does
not grant merge authority. See `docs/guides/change-safety.md` for the contract,
commands, migration invariants, and CI limits.

Create every task on the `cinste` board. Use an isolated worktree for code
changes. Use `completion-contract OWNER/REPO` only when publication is
explicitly approved.

```powershell
hermes kanban create "Task title" `
  --body "Task contract, paths, validation, and stop conditions." `
  --workspace worktree `
  --max-retries 1 `
  --completion-contract local-only
```

Run automated security review for Production-sensitive development changes.
Keep Production deployment, live migration application, real financial
transactions, and irreversible external actions blocked for human approval.

Do not mark a task complete only because a worker produced a commit. Require
the task contract, validation output, and review evidence.

## Bounded pilot

The first pilot must use a low-risk, local-only task. Do not start the gateway
until the provider is authenticated and the task is reviewed.

```powershell
hermes kanban create "CINSTE Hermes pilot: inspect repository state" `
  --body "Read AGENTS.md and docs/current/current-state.md. Report repository state. Do not edit files. Do not access hosted systems." `
  --workspace scratch `
  --max-retries 1 `
  --max-runtime 10m `
  --completion-contract local-only `
  --idempotency-key cinste:pilot:repository-inspection
hermes kanban promote <TASK_ID>
hermes kanban dispatch
hermes kanban watch
```

Stop the pilot if the worker attempts a Production action, requests a secret,
changes a protected area, exceeds the runtime limit, or fails twice.

Inspect the result before enabling continuous operation:

```powershell
hermes kanban show <TASK_ID>
hermes kanban runs <TASK_ID>
hermes kanban log <TASK_ID>
```

## Continuous operation

The pilot passed. The Windows login item starts the gateway after user login.
The gateway uses the Startup-folder fallback because Scheduled Task elevation
was not used. The active gateway continues without a restart.

Hermes runs the `CINSTE backlog audit` cron job every six hours. The job reads
the repository and the `cinste` board. It creates only evidence-based cards and
uses stable idempotency keys. It does not edit repository files.

Hermes can continue across separate sessions because the Kanban board and
worker history persist in Hermes user data. Codex handles the task-local code,
test, and debug session. Hermes remains the source of task status.

Each implementation needs local tests, an independent read-only review, and a
dependent integration task. The integration task can push reviewed development
commits. Repository CI remains the validation authority for pushed code.

Completion requires all implementable cards to be integrated and validated.
The board can keep external evidence cards blocked with exact requirements.
Hermes must not deploy Production, apply live migrations, run real financial
transactions, or perform irreversible external actions without owner approval.
