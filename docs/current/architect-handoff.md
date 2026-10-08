---
tur: mevcut
durum: dogrulanmis
kod-kapsami: []
---
# CINSTE Architect Handoff

## Current objective

Realign the implemented V1 with the locked mobile-first platform strategy, then
prepare for controlled external beta. The immediate product objective is the
smallest safe native Giver vertical slice. Astra has reviewed its trust
boundary and set binding BFF/app-link requirements; implementation has not yet
started.

## Roadmap snapshot

### Done

- Locked mobile-first platform strategy, cross-platform role-surface audit, and
  native Giver vertical-slice plan.
- Core and Impact foundations; native Student journey; functional web Giver,
  Partner, Organization Operator, and Admin foundations.
- Secure web Giver provisioning (`0021`) and cross-role funding eligibility
  correction (`0022`), with the latter applied to DEV/QA.

### In Progress

- The first reviewed native Giver BFF batch is implemented in the repository:
  Node-runtime routes plus private, database-backed rate limiting. Ordered
  migration `0023`, QA secret/callback configuration, and hosted validation
  remain before it can be used.
- Separate DEV/QA operational work: hosted behavioral validation of `0022`.

### Next

1. Implement the reviewed native multi-workspace foundation and Giver vertical
   slice while preserving Student and web Giver behavior.
2. Run focused hosted DEV/QA behavioral validation for `0022`.
3. Resolve native Partner and Organization operational-surface gaps in the
   locked mobile-first sequence.
4. Close production-readiness work needed for controlled external beta.

### Blocked

- Native Giver BFF use is blocked on `0023` application and QA host secret/
  callback configuration; native Partner and Organization surfaces are absent,
  and the mobile router is still Student-centric.
- External beta lacks Production infrastructure, real payments, monitored
  scheduler activation, release/signing, observability, legal/support, and
  deletion/retention delivery.
- Partner and Organization public acquisition paths await owner decisions.

### Later

- Decide web Giver's permanent companion versus acquisition/handoff role after
  native parity evidence.
- Define real-payment provider/business semantics and finalize brand, domain,
  and legal/privacy/support policy for release.

## Current product / architecture direction

CINSTE is mobile-first. Student and Giver core consumer journeys belong in the
native Expo app. Partner and Organization Operator each require an operational
web portal plus native capabilities for relevant on-the-go work. Admin is a
web-first control plane; no native Admin surface is approved. Public web is for
discovery, acquisition, app handoff, login, and Partner/Organization portal
access.

Surface placement does not create authority. One stored `profiles.role` plus
independently authorized Partner and Organization assignments remains the
model; RLS, RPCs, trusted server execution, and assignment checks are
authoritative across all clients. The native router must evolve beyond its
current Student-centric role boundary to resolve additive workspaces without
turning a client route or saved workspace choice into authorization.

## Relevant locked owner decisions

- Student claims require verification; the normal claim limit is one successful
  claim per rolling 24 hours; QR redemption is server-authoritative and limited
  to assigned Partner inventory.
- Funding inventory never derives from untrusted client state. Mock funding
  remains service-only; real payments are a separate owner/Astra workstream.
- Giver outcomes use the self-scoped `list_my_giving_outcomes()` contract.
  Pooled/ambiguous attribution is unavailable; activity-derived metrics are
  null, never zero, below the five-person privacy threshold.
- Existing Giver provisioning remains trigger-authoritative: a native client
  must not set a role through metadata or receive provisioning grants or
  service credentials.
- Keep current web Giver capability during the native transition. Its permanent
  companion-versus-handoff role is an owner decision only after native parity
  evidence.
- Partner acquisition/onboarding authority and the public Organization
  acquisition entry remain owner decisions. Organization onboarding/activation
  remains Admin/CINSTE-controlled.

## Current repository / deployment state

This handoff was reconciled from `main`/`origin/main` at `d49f6a1` before its
own documentation commit; inspect current Git state at every session start.
Migrations `0001` through `0023` exist in the repository. DEV/QA application of
`0018` through `0022` is owner-confirmed; `0022_funding_eligibility.sql` was
manually applied through the Supabase SQL Editor but has not received hosted
behavioral validation. Production Supabase and evidenced production web/mobile
deployment do not exist. Payments are mock-only. The maintenance Cron is
registered in DEV/QA but intentionally inactive. No EAS production profile,
signing, or TestFlight evidence exists.

The web app has public/auth routes and functional Giver, Partner, Organization
Operator, and Admin workspaces. Native has the Student journey, but its current
`resolveMobileDestination` sends every non-Student profile to `role-boundary`;
there are no Giver, Partner, or Organization routes. `0021` provisioning and
the `0022` funding RPCs are correctly service-only on the web server path.

## Active workstreams

- No product implementation is currently active.
- The mobile-first surface audit and native Giver vertical-slice plan are
  complete as analysis. The latter is in
  `docs/current/native-giver-vertical-slice-plan.md`.
- Separate operational work remains: hosted behavioral validation of `0022`.
  It is not a reason to bypass the native Giver security review.

## Blocked / waiting workstreams

- Native Giver BFF hosted acceptance remains blocked until `0023` is applied
  and the QA Next.js host has the isolated service and rate-limit secrets plus
  exact confirmation callback configuration. Native workspace routing and UI
  remain separate, unimplemented work.
- Partner public acquisition/onboarding and Organization public acquisition
  await the owner decisions above.
- External beta remains blocked by production infrastructure, real payments,
  monitored scheduler activation, release/signing, observability, legal/support
  entry points, deletion/retention work, and final acceptance.

## Important findings

- Reusable native-safe contracts already exist for active catalog reads and
  authenticated `list_my_giving_outcomes()` reads. The three outcome states
  (`available`, `privacy_suppressed`, `unavailable`) must remain distinct.
- Native must never call `create_mock_checkout` or `confirm_mock_payment`,
  write financial tables, ship a service key, or assert a Giver ID. A reviewed
  BFF derives the caller from verified bearer auth; the database retains its
  independent eligibility, ownership, price, inventory, and transaction checks.
- Existing native signup is intentionally Student-default. Giver signup needs
  a separate trusted role-intent path; an existing account must not be upgraded.
- Student verification must gate Student routes only, not hide separately
  authorized Giver, Partner, or Organization workspaces.
- The known database defect is the `expire_stale_claims()` double-UPDATE CTE:
  inventory/status restoration works, but its restoration timestamp is not
  reliable evidence.

## Open architecture or product questions

- Astra selected the existing Next.js deployment as the Node-runtime BFF host.
  A separate edge host requires a new equivalent-controls review.
- After native Giver parity evidence, decide whether Giver web stays a
  permanent companion or is reduced to acquisition/handoff.
- Owner decisions remain needed for Partner acquisition/onboarding authority,
  Organization public acquisition, real-payment provider/business semantics,
  final brand/domain, and legal/privacy/support policies.

## Security / Astra checkpoints

- Native Giver boundary review completed: implementation must use Node-runtime
  route handlers, server-side bearer verification and profile recheck, strict
  schemas, rate limits, redacted logs, isolated secrets, and an exact PKCE
  confirmation callback. No Server Actions or native service-RPC calls.
- Required before real payments, scheduler identity/activation, Production
  migration/RLS/grant verification, QA target allow-listing, sensitive
  telemetry/redaction, deletion/erasure, and material Auth/deep-link changes.
- Do not relax direct-table RLS or expose service-only funding/provisioning
  contracts to solve native-client needs.

## Do not redo

- Do not repeat the completed cross-platform audit or native Giver planning
  before inspecting their current documents and implementation evidence.
- Do not implement a duplicate authenticated Student web product or native
  Admin surface without a new owner decision.
- Do not treat commit/push, DEV/QA application, hosted validation, and
  Production as interchangeable states.
- Do not remove web Giver before parity evidence and an explicit owner decision.

## Recommended next actions

1. Apply and validate `0023` plus QA BFF secret/callback configuration.
2. Implement the reviewed native multi-workspace foundation and Giver vertical
   slice in the recorded sequence, preserving existing Student behavior.
3. Run hosted behavioral validation for already-applied `0022` as a separate
   DEV/QA task.

## Immediate next action

**IMPLEMENT:** apply/validate the reviewed native Giver BFF foundation in
DEV/QA, then add the native workspace resolver and Giver auth/read-only UI.
Do not add native funding calls until the BFF is hosted-validated.
