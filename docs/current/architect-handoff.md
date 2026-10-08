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
boundary; the BFF foundation and `0023` migration are implemented and
owner-confirmed applied to DEV/QA. The limiter's hosted validation passed and
a QA Vercel host is live; native Giver signup and an Expo-side fixed-code
callback scaffold are implemented locally. Astra review identified a concrete
correction: native owns a CSPRNG PKCE verifier and submits only its S256
challenge to the BFF; after the exact verified HTTPS app link, native redeems
the Auth code with that verifier over HTTPS and sets the returned session.
Hosted configuration waits for that correction and the real iOS signing ID.
Android is explicitly out of scope for the current native Giver slice.
The owner has no Apple Developer Program membership yet. Windows is the
primary development machine and iPhone testing uses Expo Go; retain that
workflow where possible. The older MacBook is required only for genuine
iOS-specific build, signing, TestFlight, or release work.

## Roadmap snapshot

### Done

- Locked mobile-first platform strategy, cross-platform role-surface audit, and
  native Giver vertical-slice plan.
- Core and Impact foundations; native Student journey; functional web Giver,
  Partner, Organization Operator, and Admin foundations.
- Secure web Giver provisioning (`0021`) and cross-role funding eligibility
  correction (`0022`), with the latter applied to DEV/QA.
- Reviewed Node-runtime native Giver BFF foundation in `732b85a`: strict
  signup/funding routes and private database-backed rate limiting (`0023`).
- Targeted DEV/QA validation of `0023`: 12 hosted assertions passed on
  2026-10-08 for service-only execution, direct API-role denial, private
  storage API denial, the configured burst quota, and invalid fingerprint
  rejection. No Production environment was contacted.
- QA Vercel host at `https://cinste.vercel.app`: its stable domain returned
  HTTP 200 on 2026-10-08. Vercel's deployment label is not business Production.
- Read-only native Giver catalog/detail and My Giving outcomes are implemented:
  active offer/partner/category reads use existing RLS, outcomes use the
  no-argument self-scoped RPC, and all three privacy states are preserved.
  The full mobile suite is 42/42 and typecheck passes.

### In Progress

- The read-only native Giver surface is repository-complete. Expo Go,
  authenticated mobile, hosted mobile, signed-iOS, TestFlight, and Production
  validation remain unevidenced.

- The first reviewed native Giver BFF batch is implemented in the repository:
  Node-runtime routes plus private, database-backed rate limiting. Ordered
  migration `0023` is owner-confirmed applied to DEV/QA and its database
  behavior is hosted-validated. The owner configured its server-only
  rate-limit key in QA Vercel. The native signup client and fixed-code callback
  scaffold are locally tested, but the BFF cannot be used: the server-created
  signup does not provide a mobile-held PKCE verifier, and the hosted HTTPS
  callback/app-link association delivery is absent.
- Separate DEV/QA operational work is complete: the owner ran the guarded
  `0022` runner on 2026-10-08 and all 61 hosted non-production assertions
  passed. This does not establish Production evidence.

### Next

1. Run manual Expo Go acceptance for the new read-only Giver catalog, detail,
   and My Giving states using an existing confirmed Giver account.
2. After Apple Developer enrollment, implement the Astra-reviewed
   native-owned PKCE and verified iOS Universal Link correction, then configure
   and validate hosted QA signup/confirmation.
3. Resolve native Partner and Organization operational-surface gaps in the
   locked mobile-first sequence.

### Blocked

- Native Giver BFF use is blocked on implementing the Astra-reviewed PKCE and
  verified iOS Universal Link correction. The owner must supply a real iOS
  bundle ID and Apple Team ID for the association file; Android is not in the
  current scope. Do not configure the callback variable or Auth redirect
  allowlist until the corrected implementation is ready. Native Partner and
  Organization surfaces are absent, and the mobile router is still
  Student-centric.
- iOS Universal Link, signed-build, TestFlight, and release acceptance are
  blocked by the absence of an Apple Developer Program membership. Expo Go on
  the owner's iPhone remains appropriate for ordinary Windows-based native
  development but cannot prove the release app's signed Universal Link.
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

The repository tracks `main`/`origin/main`; the only pre-existing working-tree
entry is the intentional untracked `docs/brand/` owner-review area. Migrations
`0001` through `0023` exist and are pushed. DEV/QA application of `0018`
through `0023` is owner-confirmed; `0023` passed its focused hosted database
validation on 2026-10-08, while `0022_funding_eligibility.sql` passed 61
owner-run hosted non-production assertions on the same date. Production Supabase and evidenced
production web/mobile deployment do not exist. Payments are mock-only. The
maintenance Cron is registered in DEV/QA but intentionally inactive. No EAS
production profile, signing, or TestFlight evidence exists. Windows is the
owner's primary development environment and iPhone testing uses Expo Go; an
older MacBook is reserved for later iOS-specific build/signing/TestFlight work.

An owner-created QA Vercel project now serves `https://cinste.vercel.app` from
the repository; its stable domain returned HTTP 200 on 2026-10-08. The Vercel
deployment is configured against QA resources and its provider environment
label must not be reported as a business Production deployment. The owner
reports `NATIVE_BFF_RATE_LIMIT_KEY` configured server-side; its value was not
inspected. The repository contains an Expo callback scaffold but no hosted
callback/association delivery. Astra has selected a viable native-owned PKCE
correction; the required iOS signing identity is not yet evidenced. Android is
out of scope for this slice.

The web app has public/auth routes and functional Giver, Partner, Organization
Operator, and Admin workspaces. Native has the Student journey plus the reviewed
workspace resolver, chooser, and read-only Giver catalog/detail/outcomes shell;
Partner and
Organization operations remain at `role-boundary`. `0021` provisioning and
the `0022` funding RPCs are correctly service-only on the web server path.

## Active workstreams

- Native Giver BFF foundation and `0023` are complete, pushed, owner-confirmed
  applied to DEV/QA, and database-validated there; its QA Vercel host and
  server-only rate-limit key are owner-confirmed. The confirmation correction
  is Astra-reviewed but awaits implementation and mobile signing identities.
- The mobile-first audit and native Giver vertical-slice plan remain the
  implementation guide for the next auth/callback and read-only surfaces.
- Hosted behavioral validation of `0022` is complete in DEV/QA: the guarded
  runner passed 61 owner-run non-production assertions on 2026-10-08.

## Blocked / waiting workstreams

- Native Giver BFF use remains blocked until the reviewed native-owned PKCE
  and hosted HTTPS app-link association correction is implemented. Focused
  hosted limiter validation has passed and the rate-limit key is
  owner-confirmed server-side. Native
  workspace routing and UI now exist as repository-only presentation surfaces;
  physical-device and hosted mobile validation remain pending.
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
- Astra review completed for the confirmation correction. Native must generate
  and securely retain a CSPRNG verifier; submit only an S256 challenge to the
  BFF; accept only the exact HTTPS callback with one authorization code and no
  other parameters or fragment; redeem the code directly against Supabase's
  PKCE token endpoint over HTTPS; then set the session from that trusted
  response. No raw tokens may arrive via a link. The BFF must retain the grant
  and pass the challenge through its Auth signup request. Host the exact
  fallback and iOS association file only after the real app ID is supplied;
  Android is out of scope for this slice.
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

1. Run the bounded Expo Go manual acceptance below for the read-only Giver
   surface; it does not require Apple signing or a Mac.
2. When Apple Developer membership exists, owner supplies the iOS bundle ID
   and Apple Team ID; then implement the approved PKCE/Universal Link
   correction and validate hosted QA signup/confirmation.
3. Resolve native Partner and Organization operational-surface decisions and
   implementation gaps.

## Immediate next action

**NEXT BOUNDED TASK:** manually validate the read-only Giver surface in Expo Go
on iPhone with an existing confirmed Giver account: catalog load and empty/error
states, offer-detail navigation, and each available privacy outcome state that
the fixture data can evidence. Confirm there are no checkout/payment controls.
Record only observed device evidence; do not claim signed-iOS, TestFlight, or
Production acceptance.
