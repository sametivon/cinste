# AGENTS.md

# CINSTE Repository Agent Rules

## Source of truth
Repository docs are persistent project memory. Do not rely on chat history being complete.

Before changing code, read only the docs relevant to the task:
- `docs/PROJECT.md`
- `docs/CURRENT_STATE.md`
- feature-specific specs such as `docs/impact/IMPACT_SPEC.md`

If a directory contains a more specific `AGENTS.md`, follow it in addition to this file.

Do not duplicate domain-specific instructions here.

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

Do not:
- redesign unrelated areas
- reopen approved product decisions without a concrete reason
- refactor unrelated code
- create extra features
- weaken RLS or server-side authorization to solve a client problem

If you notice an unrelated issue, report it instead of fixing it.

## Product decisions
`docs/PROJECT.md` and feature specs contain owner-approved decisions.

You may flag a documented decision as risky, but do not silently replace it.

Ask for clarification only when:
- two materially different product behaviors are possible
- proceeding would contradict an approved product decision
- destructive or irreversible data action is required
- security/privacy behavior is genuinely ambiguous
- required external credentials or owner-only actions are missing

Do not stop between ordinary implementation steps to ask "should I continue?"

## Design work
For UI/UX or branding tasks:

- Treat `docs/brand/BRAND.md` as the current brand source of truth.
- When `docs/design/DESIGN_SYSTEM.md` exists, treat it as the implementation-level design source of truth.
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

After materially changing project state, update `docs/CURRENT_STATE.md`.

Stop after completing the scoped task.
