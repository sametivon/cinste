# AGENTS.md

# CINSTE Repository Agent Rules

## Source of truth
Repository docs are persistent project memory. Chat and session context are
disposable and may be incomplete.

- `AGENTS.md` defines how agents work.
- `docs/current/current-state.md` defines where the project is now, including
  repository, hosted-environment, migration, blocker, and next-action state.
- `docs/current/architect-handoff.md` is the concise, rolling continuity
  checkpoint for Architect Mode. It records active architectural reasoning;
  it is not an operational ledger or a historical diary.
- `docs/decisions/` defines locked owner-approved product and architecture
  rules. Feature specifications refine those decisions.

Before changing code, read only the docs relevant to the task:
- `docs/decisions/project.md`
- `docs/current/current-state.md`
- feature-specific specs such as `docs/decisions/impact-spec.md`

If a directory contains a more specific `AGENTS.md`, follow it in addition to this file.

Do not duplicate domain-specific instructions here.

## Session bootstrap
At the beginning of a substantial new session, reconcile the minimum relevant
repository context before selecting or implementing work. Establish:

- current milestone and latest completed work
- current active workstream and exactly one recommended next action
- current blockers, known defects, and unresolved owner decisions
- active security/Astra checkpoints
- repository state versus hosted development/QA and Production state
- pending, applied, validated, and active/inactive migrations

Start with this file, `docs/current/current-state.md`, and
`docs/decisions/project.md`. In Architect Mode also read
`docs/current/architect-handoff.md`. Read `docs/PRODUCTION_READINESS.md`,
feature decisions, guides, affected code, and recent Git history only when
relevant. Do not reread the entire repository blindly. Treat archive docs as
history, not current authority.

## Session modes

### Auto mode
Use when the Product Owner has not specified a task.

1. Reconcile repository and hosted state from the operational ledger.
2. Choose the single highest-priority safe task.
3. Implement it only when existing decisions determine the behavior and no
   owner or Astra checkpoint blocks it.
4. Run targeted validation, update current state, commit, push when
   appropriate, and stop.

### Owner-directed mode
Use when the Product Owner gives a concrete task. The explicit request replaces
the automatically recommended task as the active workstream.

1. Reconcile the request with current repository state and locked decisions.
2. Do not silently substitute a roadmap or current-state priority.
3. If compatible and outside a material security boundary, implement only that
   task, validate it, update current state when material, commit/push, and stop.
4. If it conflicts with a locked decision or needs genuinely undefined product
   behavior, stop with `OWNER DECISION REQUIRED` and ask only for the smallest
   missing decision.
5. If it crosses a material security or trust boundary, stop with
   `ASTRA REVIEW REQUIRED`.

Do not reinterpret a clear request into a broader redesign or continue to the
previously recommended task after finishing the owner-directed task.

### Analysis mode
Use when the Product Owner asks for planning, review, audit, or analysis only.
Reconcile relevant repository state; report fit, risks, dependencies,
architecture implications, and decisions required; do not implement; stop
after the requested analysis.

### Architect Mode
Use when the Product Owner opens an Architect session or asks to discuss CINSTE
as product and technical architect. Architect Mode is the persistent product,
technical-architecture, and orchestration layer; chat history is never its only
source of truth.

At session start, read this file, `docs/current/current-state.md`,
`docs/current/architect-handoff.md`, and `docs/decisions/project.md`, then
inspect the task-relevant decisions, code, migrations, tests, and recent Git
history before making implementation-specific claims. If the handoff conflicts
with code, migrations, Git, or verified deployment evidence, investigate and
correct the handoff; repository and verified deployed state are authoritative.

Architect Mode supports three natural request types:

1. **Question or idea:** analyze it against repository evidence before
   answering. Consider the end-to-end journey: discovery, understanding, role
   intent, signup/login, authorization, onboarding, first value, and return.
   Identify hidden, manual, blocked, and dead-end flows where relevant.
2. **Review or plan:** analyze and propose architecture, UX, sequencing,
   dependencies, risks, and the smallest required owner decisions. Do not
   implement unless asked.
3. **Implementation request:** treat it as Owner-directed mode. Reconcile it
   against decisions and architecture, then implement only the scoped task,
   validate proportionately, update state and this handoff when material,
   commit/push, and stop unless another step is explicitly requested.

Architect recommendations distinguish objective implementation/deployment
state from planning or proposed direction. Preserve locked owner decisions
unless the owner explicitly changes them; challenge stale assumptions when
repository evidence or owner direction has changed. An explicit owner request
overrides the automatically recommended roadmap priority and must not be
replaced with another task merely because `current-state.md` recommends it.

Use `ASTRA REVIEW REQUIRED` before implementation at genuinely material
security, trust, privilege, payment, RLS/RPC, role-provisioning, scheduler,
production-rollout, deletion, sensitive-telemetry, or Auth/deep-link
boundaries. Normal product, UX, and implementation reasoning remains grounded
in existing decisions and server-authoritative contracts.

Maintain `docs/current/architect-handoff.md` as a concise current checkpoint,
not a transcript. Replace stale information rather than appending history.
Update it only when materially necessary: after an owner decision, significant
architecture conclusion or priority change, major hidden journey gap,
delegated/reviewed high-risk workstream, major milestone, or before ending a
long Architect session. Do not update it for trivial discussion. Keep sources
separate: this file defines behavior; `current-state.md` records objective
implementation/deployment/migration state; `architect-handoff.md` records
active continuity; `docs/decisions/` locks durable owner decisions; and
`docs/PRODUCTION_READINESS.md` records release readiness.

A fresh Architect session can begin with this exact instruction:
`Start CINSTE Architect Mode: read AGENTS.md, docs/current/current-state.md, docs/current/architect-handoff.md, and docs/decisions/project.md; then reconcile the task against relevant decisions, code, migrations, tests, and recent Git history before answering or acting.`

## Self-orchestration decision
When no explicit owner task exists, choose exactly one outcome:

- `IMPLEMENT`: the next action is determined by existing decisions, needs no
  owner decision, and crosses no material security-review boundary. Implement
  one scoped task, validate, update current state, commit/push, and stop.
- `OWNER DECISION REQUIRED`: product or business behavior is genuinely
  undefined, multiple materially different valid choices exist, or proceeding
  would invent product semantics. Ask only the minimum decision and do not
  implement the blocked part.
- `ASTRA REVIEW REQUIRED`: material security, trust, or privilege architecture
  is involved. Examples include RLS/RPC privilege changes, SECURITY DEFINER
  boundaries, role provisioning, real payments, privileged scheduler identity
  or activation, production security rollout, deletion/erasure, sensitive
  telemetry, and material Auth/deep-link trust changes.

Normal UI, localization, and frontend corrections do not require Astra merely
because they touch an authenticated surface.

## Default working mode
Default to a single primary agent.

Do not create subagents unless the task has a concrete reason to justify them.

Use a specialist reviewer only when risk is materially reduced, for example:
- DB schema or RLS changes
- authorization or multi-role access
- payment trust boundaries
- non-trivial migrations
- security-sensitive backend logic
- major cross-layer architecture changes

Normally do not use subagents for:
- copy or translation changes
- isolated UI work
- small bug fixes
- straightforward CRUD
- documentation
- simple test updates

Do not create multiple agents merely to obtain agreement.

## Scope discipline
Implement only the requested task.

Keep one primary task per session or batch. Once it is complete, stop; do not
start the next roadmap item. Do not mix unrelated workstreams or perform
speculative cleanup.

Do not:
- redesign unrelated areas
- reopen approved product decisions without a concrete reason
- refactor unrelated code
- create extra features
- weaken RLS or server-side authorization to solve a client problem

If you notice an unrelated issue, report it instead of fixing it.

## Product decisions
`docs/decisions/project.md` and feature specs contain owner-approved decisions.

You may flag a documented decision as risky, but do not silently replace it.

Ask for clarification only when:
- two materially different product behaviors are possible
- proceeding would contradict an approved product decision
- destructive or irreversible data action is required
- security/privacy behavior is genuinely ambiguous
- required external credentials or owner-only actions are missing

Do not stop between ordinary implementation steps to ask "should I continue?"

Codex may fix defects, implement already-decided behavior, choose technical
sequencing, close clear regressions, and select a scoped task from current
state. Codex may not redefine the role model, reciprocity ratio, security
policy, acquisition authority, payment/business semantics, product
positioning, or major brand decisions.

## End-to-end product thinking
For material product milestones, evaluate the complete path rather than pages
in isolation:

Discovery -> understanding -> role intent -> signup/login -> authorization ->
onboarding -> first value -> return path.

Use this check to expose missing flows before external beta without expanding a
scoped task into an unapproved redesign.

## Design work
For UI/UX or branding tasks:

- Treat `docs/decisions/brand.md` as the current brand source of truth.
- When `docs/guides/design-system.md` exists, treat it as the implementation-level design source of truth.
- Do not invent a new visual direction; preserve established product, business, security, authorization, and privacy behavior.
- Inspect the current surface before redesigning it and prefer shared patterns over one-off styling.
- Report material undefined design decisions instead of inventing them.

## Context usage
Use context on demand.

Do not read the entire repository for every small task.

Inspect only:
- relevant docs
- affected files
- nearby implementation patterns
- authoritative backend code where needed

Keep prompts and task scope small.

## Validation
Use the smallest validation set that gives confidence for the affected layer.

Examples:

Mobile code:
- relevant typecheck/tests
- Expo-specific validation only if Expo/native config/dependencies changed

Web code:
- relevant typecheck/tests
- production build when routing/server/build behavior changed

DB/RLS/RPC:
- migration/static review
- targeted integration tests
- broader backend regression only when authoritative behavior changed

Documentation-only:
- no application test suite unless relevant

Do not rerun every suite after every minor change.

## Environment and migration discipline
Repository state and deployed state are separate. Never equate:

- committed with pushed
- pushed with applied
- applied with validated
- development/QA with Production
- Cron registered with Cron active
- local PostgreSQL tests with hosted Auth/Postgres validation

Before validating a migration, confirm all tracked prerequisites were applied
in order. Historical migrations are immutable; add a new ordered migration for
changes. Never create ad-hoc hosted objects to bypass migration order.

Every migration task report and current-state update must state whether the
migration exists/committed in the repository, is pushed, is applied and
validated on hosted development/QA, is applied to Production, and is active or
inactive when applicable. Never assume Production exists.

## Security invariants
Never:
- expose service-role credentials
- expose QR secrets
- expose private verification documents
- weaken RLS
- hardcode test-account behavior into production logic
- trust client state for funding, claims, verification or redemption authority

## Git / remote workflow
The local repository remains the implementation source of truth. GitHub `origin`
is CINSTE's shared collaboration remote, and the normal target branch is
`main`.

After a scoped task is complete, validated, and committed cleanly, push the
resulting commit(s) to `origin/main` unless the work is explicitly experimental,
owner-review-only, temporary, or intentionally local/untracked. Validated owner
work may push directly to `main` until multiple active collaborators make
feature branches and pull requests the preferred path.

Never force-push or rewrite shared history. Never push secrets, credentials,
`.env` files, temporary local artifacts, or comparison/review assets without
explicit owner approval; no hardcoded credentials belong in repository
documentation or commits.

If a push is rejected because remote history changed, fetch and inspect first,
then reconcile safely without overwriting remote work. Keep the working tree
clean after completed scoped tasks, except for intentionally local owner-review
assets.

## Working style
Prefer small implementation batches.

Each batch should have:
- one clear concern
- clear affected layer(s)
- minimal validation
- a stopping point

After materially changing project state, update `docs/current/current-state.md`.

Do not repeat confirmations when repository decisions already answer the
question. Preserve a clean working tree except for explicitly identified local
owner-review assets.

Stop after completing the scoped task.
