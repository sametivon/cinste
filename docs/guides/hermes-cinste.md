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

After the pilot passes, add approved backlog cards to the `cinste` board. Run
the gateway in a controlled Windows session. Keep the gateway stopped when no
autonomous work is approved. Do not install an auto-start task without explicit
approval.

Hermes can continue across separate sessions because the Kanban board and
worker history persist in Hermes user data. Codex handles the task-local code,
test, and debug session. Hermes remains the source of task status.

The repository CI workflow remains the validation authority for pushed code.
Hermes must not merge pull requests, push branches, deploy, apply migrations,
reset hosted fixtures, activate schedulers, or use Production credentials.
