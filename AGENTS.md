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

## Working style
Prefer small implementation batches.

Each batch should have:
- one clear concern
- clear affected layer(s)
- minimal validation
- a stopping point

After materially changing project state, update `docs/CURRENT_STATE.md`.

Stop after completing the scoped task.