# CINSTE Repository Rules

## Source of truth

Repository documents are persistent project memory. Chat context is not.

- `AGENTS.md` defines how Codex works in this repository.
- `docs/current/current-state.md` records current repository, environment,
  migration, blocker, and next-action state.
- `docs/decisions/` contains locked product and architecture decisions.

Before changing code, read `docs/current/current-state.md`,
`docs/decisions/project.md`, and only the task-relevant decision, code,
migration, and test files. Treat archive documents as history, not current
authority. Follow a more specific `AGENTS.md` in a subdirectory as well.

## One simple workflow

1. Reconcile the requested task with the relevant repository state and locked
   decisions.
2. Implement one bounded task when its behavior is already decided.
3. Stop and ask for the smallest missing decision when product behavior is
   genuinely undefined, external access is required, or a destructive action
   is not explicitly authorized.
4. Stop and request a security review before material changes to authorization,
   RLS/RPC privilege, payment authority, role provisioning, Auth/deep-link
   trust, sensitive telemetry, deletion, scheduler identity, or Production
   security controls.
5. Run proportionate validation. Update `current-state.md` when project state
   changed materially. Commit, push, and stop.

Do not substitute a different roadmap task for a clear owner request. Do not
continue into adjacent work after the requested task finishes.

## Scope and product rules

- Keep one primary task per batch. Do not redesign unrelated areas, add
  speculative features, or refactor unrelated code.
- Preserve locked decisions in `docs/decisions/`. Flag risk, but do not silently
  replace a decision.
- For material product work, check the complete journey: discovery,
  understanding, role intent, signup/login, authorization, onboarding, first
  value, and return.
- For design work, use `docs/decisions/brand.md` and
  `docs/guides/design-system.md` when present. Reuse existing patterns and do
  not invent a new visual direction.
- Application roles and server authority are product rules. Client navigation,
  UI state, and deep links never grant authority.

## Security, environments, and migrations

Never expose service-role credentials, QR secrets, or private verification
documents. Never weaken RLS, hardcode test-account behavior, or trust client
state for funding, claims, verification, or redemption authority.

Keep repository, pushed, hosted development/QA, and Production evidence
separate. Do not equate committed with pushed, pushed with applied, or
development/QA with Production.

Historical migrations are immutable. Add ordered migrations for changes. Apply
prerequisites in order and never create ad-hoc hosted objects to bypass that
order. Migration reports must state repository, push, hosted development/QA,
validation, Production, and active/inactive runtime state separately.

## Validation and Git

Use the smallest validation set that gives confidence for the affected layer.
Do not claim device, hosted, or Production evidence that was not obtained.

Push validated owner work to `origin/main` unless it is explicitly temporary,
experimental, or owner-review-only. Never force-push, rewrite shared history,
commit secrets or `.env` files, or stage intentionally local owner-review
assets. If a push is rejected, fetch and inspect before reconciling.

Keep the working tree clean after a completed batch, except for explicitly
identified local owner-review assets such as `docs/brand/`.

## Agent tools

- Use Ponytail Full for the smallest complete implementation. It does not
  permit skipping required security, accessibility, validation, or device
  acceptance.
- Use ASD-STE100 Strict for agent-facing prompts, migration commands, test
  instructions, and operational status text. Do not use it for product,
  brand, onboarding, or localized UI copy.
- These tools do not override this file, locked decisions, or security review
  requirements.
