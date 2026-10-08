---
tur: mevcut
durum: dogrulanmamis
kod-kapsami: []
---
# docs/current/current-state.md

# CINSTE Current State

This document is the operational ledger for fresh sessions. The sections below
this ledger retain detailed implementation and validation context; when older
prose conflicts with this ledger, reconcile and correct it rather than assuming
the older statement is current.

## Current milestone

Realign the implemented V1 with the locked mobile-first platform strategy, then
prepare the resulting cross-platform product for controlled external beta.
Core, Impact, web role workspaces, public Student/Giver acquisition, secure
new-account Giver provisioning, the native Student journey, and the read-only
native Giver catalog/outcomes slice exist. Native Giver funding, Partner, and
Organization Operator journeys do not. Admin is a functional
web foundation rather than the complete system control plane. External beta
also remains blocked by production infrastructure, real payments, production
operations, legal/support entry points, and final release acceptance.

## Last completed work

The owner-approved mobile-first platform strategy is now recorded in
`docs/decisions/project.md`, aligned in `docs/decisions/impact-spec.md`, and
reconciled against actual web, native, and backend capability in
`docs/current/cross-platform-role-surface-audit.md`. The concrete native Giver
vertical-slice auth, workspace, provisioning, funding, and reuse plan is now
recorded in `docs/current/native-giver-vertical-slice-plan.md`. Astra has
reviewed that boundary and requires the existing Next.js deployment's dedicated
Node-runtime route handlers, verified bearer identity, stored-role recheck,
strict schemas, exact PKCE confirmation callback, rate controls, redacted
logs, and isolated service credentials. The review is documented; no product
feature, authorization, RLS, RPC, funding, or Impact behavior has changed.

The latest implementation batch is the read-only native Giver catalog and My
Giving outcomes batch. Mobile reads active offers with active partner and
category joins under existing RLS, presents offer details without funding
controls, and calls authenticated `list_my_giving_outcomes()` with no
caller-supplied ID. The three outcome states remain distinct and suppressed or
unavailable metrics remain null, never zero. The full mobile suite passes 42/42
and mobile typecheck passes. Manual iPhone Expo Go evidence confirms that the
read-only data loads, but exposes a product-quality gap: the Giver surface is a
direct screen without a role-local native navigator or safe-area header, so it
has no bottom navigation, overlaps the status bar, and renders long QA fixture
content poorly. This is not accepted mobile UX evidence.

The preceding implementation batch is the reviewed native workspace-envelope
and Giver shell batch. Mobile now derives a presentation-only workspace envelope
from the authenticated profile plus RLS-scoped Partner/active Organization
assignment reads, revalidates SecureStore choices during session/sign-in and
foreground refresh, and provides a localized chooser and non-funding Giver
entry shell with sign-out. Student navigation and verification gates remain
unchanged. Expo lint reports two pre-existing errors outside these batches.

The preceding implementation batch was the reviewed native Giver BFF foundation:
Node-runtime signup, checkout, and confirmation routes; verified bearer plus
stored-role checks; strict schemas; generic responses; and private,
database-backed rate-limit contract in ordered migration `0023`. The owner
confirmed `0023` was applied to DEV/QA, and the focused non-production hosted
runner passed 12 limiter assertions on 2026-10-08. The native Giver signup UI,
strict BFF client, and an Expo-side fixed-code callback scaffold are now
implemented in the repository. Reconciliation found that this is not a
complete hosted confirmation flow: the Vercel host has no matching
callback/association delivery and the server-initiated signup does not
establish a mobile-held PKCE verifier for the later code exchange. Astra has
now approved the correction: native retains the verifier, sends only its S256
challenge to the BFF, and redeems the returned code over HTTPS
before setting its session. QA callback configuration remains blocked pending
implementation and a real iOS signing identity. Android is out of scope for
this slice. Both mock
funding RPCs remain service-only, and migration `0021` Giver provisioning is
unchanged.

Owner-provided hosted evidence on 2026-10-07 records migrations `0018` through
`0021` applied in order to development/QA and 57 focused Giver-provisioning
assertions passing. The owner also confirms that `0022` was manually applied
successfully to the same hosted environment through the Supabase SQL Editor.
On 2026-10-08, the owner ran the guarded reusable runner against DEV/QA and
reported all 61 hosted non-production `0022` assertions passing. This is
owner-run DEV/QA evidence only; it neither reran the migration nor establishes
Production evidence.

## Current active workstream

The native workspace-envelope/Giver-shell, onboarding, and read-only catalog/
outcomes batches are complete in the repository:
the resolver fails closed on missing/failed reads and does not call BFF, funding
RPCs, or financial tables. The Giver signup client posts only the permitted
email/password/displayName shape to the fixed BFF URL; the callback accepts
only an authorization code, is designed to exchange it through PKCE, discards
link intent, and re-runs the resolver. It is not a usable end-to-end PKCE flow
yet: the BFF signup context cannot supply the later mobile verifier, and
hosted HTTPS callback/app-link association delivery is absent. The approved
replacement is native-owned PKCE challenge plus a direct trusted token
exchange after exact-link validation. Mobile-code validation is local only; no
hosted
mobile deployment, hosted signup/callback validation, or physical-device
acceptance is evidenced.
The first native Giver BFF implementation batch is complete in the repository:
the shared limiter is database-backed, private, and service-only. Migration
`0023` is committed and pushed, owner-confirmed applied to DEV/QA, and passed
its targeted hosted database validation. The isolated QA Next.js
secret/callback configuration is not evidenced, so the BFF is not usable. The
Expo callback scaffold exists, but the hosted callback/app-link and PKCE
handoff remain unresolved. Migration `0022` is applied to DEV/QA and passed
its 61-assertion owner-run hosted behavioral validation on 2026-10-08. That
evidence remains separate from the next product-surface workstream and does
not establish Production readiness.

## Hosted environments

| Environment / service | Purpose | Current state |
| --- | --- | --- |
| Local | Implementation and targeted local/disposable-database checks | Configured per developer; local evidence is not hosted evidence |
| Hosted development/QA Supabase | Non-production Auth/Postgres/Storage and hosted assertions | Exists; migrations through `0023` are owner-confirmed applied. On 2026-10-08, 12 hosted assertions passed for `0023` and the owner-run `0022` runner passed 61 hosted non-production assertions. Fixtures and focused hosted validation are allowed |
| Production Supabase | Isolated production Auth/Postgres/Storage/RPC | Does not exist; no migration is applied to Production |
| Web deployment | QA public and operational web surfaces | Owner-created Vercel QA host exists at `https://cinste.vercel.app`; its stable domain returned HTTP 200 on 2026-10-08. The Vercel `Production` deployment label uses QA configuration and is not an isolated business Production environment |
| Mobile / TestFlight | Mobile-first Student and Giver product plus approved Partner/Organization operations | Windows is the primary development machine; owner tests on iPhone through Expo Go. An older MacBook is reserved for genuine iOS build/signing/TestFlight/release work. No Apple Developer Program membership, real bundle/team identity, QA/native-device deployment, signed build, or TestFlight release evidence exists |
| Scheduler | Claim and Impact maintenance | DEV/QA job is registered but intentionally inactive; real worker/concurrency validation, monitoring, and Production activation are pending |
| Payments | Funding authority | Mock-only; no real provider, signed webhook, or reconciliation |
| Observability | Runtime, Auth/database, scheduler, and payment visibility | Production stack and redacted alerting are not configured/evidenced |

## Migration ledger

`Repo` means the ordered migration exists at current HEAD. `Pushed` means it is
present on `origin/main`. Hosted status below is environment-specific and does
not imply Production status.

| Migration | Repo | Pushed | DEV/QA Applied | DEV/QA Validated | Production Applied | Runtime State / Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `0001`-`0017` | Yes | Yes | Yes | Focused hosted suites recorded; see detailed history | No | Active in DEV/QA; `0017` Giver outcomes passed 11 hosted assertions |
| `0018_impact_maintenance_system_attribution.sql` | Yes | Yes | Yes, owner-confirmed | Partial: local scheduler suite passed; hosted end-to-end maintenance evidence remains incomplete | No | Schema/function behavior present in DEV/QA |
| `0019_database_maintenance_runner.sql` | Yes | Yes | Yes, owner-confirmed | Partial: local atomic runner coverage passed; real concurrent hosted execution remains pending | No | Private runner present; no API-role execution grant |
| `0020_database_maintenance_cron.sql` | Yes | Yes | Yes, owner-confirmed | Partial: registration/inactive state confirmed; live worker, timeout, concurrency, and monitoring checks pending | No | `cinste-maintenance-v1` intentionally inactive |
| `0021_giver_signup_provisioning.sql` | Yes | Yes | Yes, owner-confirmed | Yes: 57 hosted assertions owner-confirmed | No | Secure provisioning active in DEV/QA; email confirmation enabled |
| `0022_funding_eligibility.sql` | Yes | Yes | Yes, owner-confirmed; manually applied through SQL Editor | Yes, DEV/QA only: owner ran 61 hosted non-production assertions on 2026-10-08 | No | Service-only Giver eligibility, ownership, pricing/activity rechecks, direct API-role denial, and idempotent state behavior validated; no Production environment exists |
| `0023_native_bff_rate_limits.sql` | Yes | Yes | Yes, owner-confirmed | Yes, DEV/QA only: 12 hosted assertions passed on 2026-10-08 (service execution; anon/authenticated denial; private API storage denial; configured 5-per-minute quota; invalid non-fingerprint rejection) | No | Active private HMAC-fingerprint limiter. The QA Next.js host's server-only `NATIVE_BFF_RATE_LIMIT_KEY` and exact HTTPS Supabase Auth redirect allowlist remain unverified; do not use the BFF |

For every future migration, update every column explicitly. Apply tracked
prerequisites in order, keep historical migrations immutable, and never create
ad-hoc hosted objects to bypass migration order.

## Open blockers

- External beta has no isolated Production Supabase, production web/domain,
  controlled promotion evidence, backup/recovery proof, or production secrets.
- Funding is mock-only; a real payment provider and trusted webhook lifecycle
  do not exist.
- The scheduler is inactive and lacks production monitoring and activation.
- Mobile production signing/TestFlight, observability, legal/privacy/support,
  and account/data-deletion delivery are incomplete.
- The owner has no Apple Developer Program membership. Keep ordinary native
  development compatible with Windows plus Expo Go on iPhone; do not require
  the older MacBook until iOS-specific build, signing, TestFlight, or release
  work genuinely requires it.
- Native Partner and Organization Operator operations remain absent. The
  workspace resolver/chooser and Giver entry shell are repository-only and have
  no authenticated physical-device acceptance yet.
- The reviewed native Giver BFF's database limiter is hosted-validated and the
  owner configured its server-only `NATIVE_BFF_RATE_LIMIT_KEY` in Vercel. The
  native callback has an Astra-reviewed correction but is not ready for
  external configuration: implement native-owned PKCE challenge, exact
  HTTPS callback validation, and verified iOS Universal Link delivery using a
  real bundle/team identity. Android is out of scope for this slice. Do not
  configure or use the callback until that implementation is complete.
- Admin is not yet a comprehensive full-system operational control plane.

## Known defects

- `expire_stale_claims()` has an existing double-UPDATE CTE; claim status and
  inventory restoration work, but its restoration timestamp is not reliable
  evidence. See `docs/guides/database-maintenance.md`.

## Owner decisions pending

- Define the Partner acquisition/onboarding authority and first entry path.
- Define the public acquisition entry for Organizations while preserving the
  locked V1 rule that onboarding and activation remain Admin/CINSTE-controlled.
- Decide only after native Giver parity evidence whether the current Giver web
  product remains a permanent companion or is reduced to acquisition/handoff.
- Select real-payment business/provider semantics before that workstream.
- Approve final production brand assets, canonical domain, and required
  legal/privacy/support policies before release.

## Security / Astra checkpoints

- Review real payments, privileged scheduler activation/identity, Production
  migration/RLS/grant verification, QA target allow-listing, sensitive
  telemetry/redaction, and any deletion or material Auth/deep-link change
  before implementation or activation. The native Giver BFF/app-link boundary
  has received Astra requirements; preserve them during implementation.

## Remaining acceptance gaps

| Type | Current gaps |
| --- | --- |
| Architecture blocker | Reviewed native Giver provisioning/funding edge, production environment/promotion controls, real payment architecture, monitored scheduler activation, telemetry/privacy boundary, deletion/retention design |
| Implementation blocker | Native Partner redemption/operational context; native Organization daily operations; comprehensive Admin control-plane information architecture; production web/mobile/release operations; Partner acquisition path after owner decision; Organization acquisition entry after owner decision; Admin workspace still has literal mixed EN/RO copy rather than complete RO/EN/TR/AR localization |
| Release acceptance / manual QA | Real public `signUp` null-session path, real confirmation-link callback, post-confirmation browser routing, direct hosted grant-catalog inspection, true simultaneous public-signup contention, physical Partner camera/redemption and assignment revocation, multi-organization switching, verification-loss history, localized error/review states, production-like role matrix, and TestFlight device checks |

The Giver provisioning items in the last row are acceptance gaps, not current
architecture blockers. Partner and Organization public cards currently show
non-actionable invitation-coming-next states; protected operational workspaces
and Admin-controlled Organization provisioning already exist.

## Next recommended action

**NEXT:** integrate the existing read-only Giver catalog, offer detail, and My
Giving reads into a cohesive native Giver workspace shell: safe-area-aware
header, role-local bottom tabs, stack-integrated offer detail, and resilient
long-content card rendering. Preserve all read-only contracts and the absence
of checkout/payment controls. Then rerun bounded Expo Go acceptance on iPhone.
The Astra-reviewed native-owned PKCE and verified iOS Universal Link correction
remains blocked until Apple Developer membership provides a real bundle ID and
Team ID. No signed-iOS, TestFlight, or Production evidence is claimed.

## COMPLETE
- Core backend hardening implemented
- student verification lifecycle implemented
- trusted mock funding flow implemented
- claim validity and expiration hardening implemented
- partner/offer/campaign admin operations implemented
- QR redemption implemented
- partner assignment controls implemented
- mobile student app implemented
- Student mobile role/auth gate implemented; the non-Student boundary is
  transitional and not the final cross-platform router
- student i18n implemented
- recipient-oriented student copy corrected
- physical QR redemption tested successfully
- mobile foreground freshness after redemption tested successfully
- unverified student onboarding tested
- verification upload/admin approval tested
- verified-student transition after approval tested

## VALIDATION HISTORY
Most recent known validation included:
- hosted backend integration suite previously reached 113 assertions
- mobile tests: 14 passed
- Expo Doctor: 21/21 passed
- web tests: 12 passed

Do not assume these numbers remain current after future changes.

## PHYSICAL QA PENDING
- partner assignment revocation physical test

## CORE MVP STATUS
Core MVP is functionally near-complete.

Do not start unrelated Core redesign while adding Impact.

## IMPACT STATUS
Product direction approved.
Approved V1 product rules are recorded in `docs/decisions/impact-spec.md`.
Impact Batch 1 foundation implemented in migration `0011_impact_batch1_foundation.sql`.

Added the additive organization and Impact backend schema, enums, constraints,
indexes, RLS foundations, append-only organization assignment/audit history,
and narrow admin RPCs for organization creation, activation/deactivation, and
operator assignment/revocation. Active `organization_users` assignment plus
active organization status is the organization access authority.

Batch 1 authorization hardening is complete in the applied migration:
internal trigger helpers are non-executable by clients, Impact table privileges
are explicit, and the reciprocity settlement reference has a foreign key.
Focused hosted coverage is at `scripts/impact-batch1-integration-test.mjs`;
the recorded hosted validation results are below.

Batch 2 implementation is delivered in applied migration
`0012_impact_batch2_opportunity_participation.sql`, with focused hosted
coverage at `scripts/impact-batch2-integration-test.mjs`. Hosted validation
passed as recorded below.

Batch 3 implementation is delivered in applied additive migration
`0013_impact_batch3_verified_contributions_reciprocity.sql`, with focused
hosted coverage at `scripts/impact-batch3-integration-test.mjs`. The migration
adds trusted completion provenance, one-time immutable contributions, the
reciprocity settlement ledger, organization/admin verification and correction
RPCs, cycle-safe waiver settlement, lock-ordered transactions, and direct
write/private-helper protections. Batch 2 completion now routes through the
trusted verification transaction, and a student cannot rejoin an opportunity
after earning its lifetime contribution. Hosted validation passed as recorded
below.

Batch 4 backend implementation is delivered in applied additive migration
`0014_impact_batch4_core_reciprocity.sql`. It adds the one-time explicit
reciprocity-policy cutover, admin-only frozen campaign classification, Core
`claim_campaign` and `redeem_claim` integration, append-only redemption
accounting, non-persistent per-claim supply exceptions, Batch 3 no-banking
completion-at-due correction, and aggregate stale-claim inventory restoration.
Hosted validation completed on 2026-10-04 after migrations `0011` through
`0014` were applied: Batch 1 (13 assertions), Batch 2 (19), Batch 3 (33),
Batch 4 (10), and the relevant Core suite (113) passed. The Batch 3 fixture
uses an explicitly past due timestamp so client/server clock skew cannot
invalidate its post-due settlement case.

## BATCH 5 IMPLEMENTATION STATUS
Impact Batch 5 UI implementation is present against the validated Batch 1-4
backend: verified-student mobile Impact browse/detail, join/cancel,
active participations, reciprocity and verified-contribution metrics, and the
post-redemption pass-it-forward CTA; organization-operator and minimum Admin
Impact operational pages reuse established RPCs and RLS. The original UI batch
made no Impact migration or authority/reciprocity/Core transaction change;
the later participation-read correction adds migration `0015` below.
Batch 5 is not complete: the current-code gaps are recorded below.

The previously identified Batch 5 web controls are implemented: operators can edit drafts via
the existing update RPC, Admin can revoke verified contributions with a reason,
and the Admin dashboard links to the Impact workspace. These controls retain
the existing RPC lifecycle, validation, authorization, and audit boundaries.

Batch 5 operational UX remediation is complete: the Admin Impact workspace is
now organized into Overview, Organizations, Participation Review,
Contributions, and Reciprocity sections; account assignment uses an
Admin-scoped name/email lookup rather than a visible UUID; contextual records
precede Admin correction actions; destructive actions require a reason and
browser confirmation; and both Admin and organization forms use persistent
labels, readable status badges, responsive cards, and in-place action feedback.
No migration, new RPC/view, direct Impact table-write path, or change to
Impact/Core authorization or transaction semantics was made.

Final Batch 5 web polish keeps mutation success feedback visible before a
client-side refresh, gives legacy reciprocity records an explicit no-due-date
fallback, and prevents the narrow shared header from forcing horizontal page
overflow. These are presentation-only changes.

Mobile runtime localization now applies the i18n resource change before
publishing the selected locale through context, so active student screens and
navigation options rerender coherently for RO, EN, and TR. The selected locale
continues to persist in SecureStore without replacing an explicit saved choice.
Arabic uses the existing per-screen RTL text and row-layout handling live; no
native direction restart is required. Invalid container `direction` styles
were removed, and the Impact opportunity detail now translates participation
status labels rather than rendering the stored enum.

The native Arabic Discover crash was corrected without a full-app restart.
Discover's nested category `FlatList` now remains horizontal in both layout
directions and is remounted only when its RTL inversion changes; it no longer
mutates a mounted virtualized list from horizontal to vertical inside the
vertical campaign list. Other student lists do not vary `horizontal` or
`inverted` across locale changes.

The native Impact return-from-join crash is corrected client-side. A student
participation remains readable even when its embedded opportunity relation is
temporarily null or filtered by the opportunity read policy; the app preserves
its status and displays translated unavailable-details copy rather than
dereferencing the missing relation. Navigation to the opportunity is offered
only while that relation is present. No RLS, RPC, schema, join, cancellation,
or contribution behavior changed.

The direct table read used by the original Impact screen cannot embed a linked
opportunity for a student because opportunity-table RLS is discovery-only.
Additive migration `0015_impact_student_participation_read.sql` introduces the
minimal authenticated, security-definer `list_my_impact_participations` read
projection, scoped strictly to `student_id = auth.uid()`. The mobile Impact
list and detail screen use it for self participation context while discovery
continues to use `list_impact_opportunities`. Migration `0015` is applied to
non-production (owner-confirmed). Its hosted RPC was verified on 2026-10-05:
13 focused read assertions passed using two existing QA student accounts,
without changing domain data. Each account's returned participation set matched
the privileged baseline exactly; cross-student filters returned no rows;
student-ID override arguments and anonymous execution were rejected. Existing
completed, disputed, and cancelled records retained opportunity/organization
context for cancelled (non-published) opportunities. The response contained
exactly the 16 declared projection fields and only linked own context, with no
student identity/contact, payment, or claim fields. This checked existing
post-cancellation records, not a newly executed cancellation transition.

## CURRENT-CODE COMPLETION CHECK (2026-10-05)
Inspected branch `main`, HEAD `3ccdaea5eaa135b83f4ed0cbe6d66a8dbc10c569`;
the working tree was clean before this documentation reconciliation.
Commits `c2975c4` (RTL Discover list remount), `b08c8ae` (null participation
relation guard), and `3ccdaea` (self-scoped participation RPC/0015) are present.

Impact Batch 5 completion patch is implemented and validated. It changes no
Core claim/redeem/payment behavior.

- Mobile list/detail loads now have explicit loading, ready, and error states.
  Every required RPC/query error is caught; contribution or reciprocity read
  failure cannot appear as zero metrics or an open state. Retry remains safe
  with the existing foreground refresh behavior.
- Impact renders active joined/overdue work separately from all supported
  historical statuses: completed, cancelled, late_cancelled, no_show, excused,
  cancelled_by_organization, expired_incomplete, and disputed. The existing
  unavailable-context fallback remains for legacy records.
- Pending/rejected students route to a read-only Impact history screen instead
  of the verified-student shell. Their participation history and verified
  metrics remain readable and verification remains available; browse/join and
  other normal verified-student capabilities remain unavailable.
- Existing student disputes are exposed only for the status set accepted by
  `student_dispute_impact_participation`. Applied migration `0016` adds the separate,
  idempotent `student_request_impact_overdue_review` RPC for owned overdue
  participations. It records an Admin-visible request and audit event without
  changing participation, contribution, or reciprocity state; direct writes
  remain denied.
- The organization workspace accepts only a server-RLS-authorized organization
  ID, defaults to the first permitted organization, and presents a selector
  when an operator has multiple active assignments. All data continues to be
  fetched under existing assignment RLS.

Local validation: mobile TypeScript and web TypeScript checks passed; focused
mobile Impact/routing tests passed (12 tests); `git diff --check` passed; and
an iOS Metro bundle completed. The focused Vitest run required the local Windows
child-process permission because the managed sandbox produced `EPERM`.

Hosted validation passed on 2026-10-05 after `0016` was applied to
non-production: `npm run test:integration:impact:batch5` passed 8 focused
assertions covering ownership, overdue-only scope, idempotency, audit/Admin
visibility, absence of settlement/contribution side effects, and direct-write
rejection. Manual physical QA remains required for the new history/error/review
states and multi-organization switching.

## BATCH 5 ACCEPTANCE GAPS
Complete the listed manual/physical Batch 5 QA, including multi-organization
switching, verification-loss history, localized error states, and review
requests. Do not expand Impact beyond Batch 5 without a new owner-directed
scope. The operational ledger above, not this historical batch section, owns
the repository-wide next action.

## PUBLIC LANDING PAGE
The public landing page has a presentation-only redesign using the provisional
V1 brand and `docs/guides/design-system.md`. It explains experience funding,
student discovery and redemption, and continuing community impact, with
localized content for RO, EN, TR, and AR. Existing routes and product behavior
are unchanged.

## STUDENT MOBILE UI
The native student app has a presentation-only V1 polish pass. Its shared
mobile tokens and primitives now use the provisional coral-led palette, Plus
Jakarta Sans (with platform fallback for Arabic glyphs), V1 spacing/radius,
semantic status treatment, and restrained press feedback. Discover, offer and
claim detail, My CINSTE, Profile, verification, and Impact surfaces were
updated without changing mobile routes, Supabase/RPC behavior, claim/redeem
semantics, or Impact rules.

## WEB AUTH ROUTING
Post-login web destination resolution now considers both the existing profile
role and active Organization Operator assignment. A single available workspace
opens directly; an account with multiple legitimate surfaces receives a small
workspace choice. Organization access remains assignment- and active-
organization-based; no profile role, RLS, or auth behavior was changed.

## ORGANIZATION OPERATOR V1 UX
The Organization Operator workspace has a presentation-only V1 completion
pass. It queries opportunities and participations only after resolving the
server-authorized selected organization, so switching context refreshes the
scoped records instead of reusing a cross-organization client-side list.

The workspace now separates the action queue, opportunity lifecycle groups,
scheduled work in progress, and history/review. Completion verification is
offered only for eligible existing `joined` records: flexible work before its
due date, or scheduled work after its end. Excusal/no-show controls appear
only for eligible completed scheduled work. Overdue and disputed records are
clearly marked in a separate CINSTE Admin review group with no operator
resolution control; they no longer appear as operator-actionable work. History
also shows the existing organization-authorized contribution verification or
revocation fact when available. A contribution-history read failure is explicit
and does not hide participation history. Existing create/edit/publish/cancel
and authoritative server actions are unchanged. Loading, query-error, empty,
success, and action-eligibility copy are explicit; failures do not render as
an empty action queue.

Local validation passed web TypeScript, eight focused Organization workspace
tests, `git diff --check`, and an authenticated browser check using an existing
single-assignment QA operator. The browser check confirmed selected-organization
rendering, empty-queue/history states, opportunity lifecycle grouping, the
create form, and no horizontal overflow at 360px and 768px. Multi-organization
browser switching remains a manual QA item because the available QA account
had one active assignment; the existing selection tests cover server-authorized
selection and invalid requested IDs.

## ADMIN OPERATIONAL V1 UX
The Admin workspace now uses a compact role-local navigation and an
attention-first overview. It groups pending student verification, Impact Admin
review, depleted active campaign inventory, and pending-review/suspended
organizations using existing Admin-authorized reads only. Payment failures and
pending payments remain a read-only operational watch because V1 has no Admin
payment override.

Student verification retains the protected document route and existing RPC,
with explicit approval/rejection confirmation, loading, success, and error
feedback. Core operations now keeps claim, redemption, funding, and partner
access context while omitting student identifiers, claim IDs, QR credentials,
and bearer secrets. Impact and catalog workspaces retain their existing
authoritative actions under the shared Admin navigation; no schema, RLS, RPC
authorization, or business semantics changed.

Local validation passed web TypeScript, the focused verification/action tests,
`git diff --check`, and authenticated Admin browser checks. The browser check
confirmed all attention queues after correcting the existing organization
`pending_review` status, protected verification controls, Core operational
sections, existing Impact actions, and no horizontal overflow at 360px and
768px. The QA Admin was logged out and the browser session cleared.

## FINAL WEB PRESENTATION PASS
The web auth/account views and shared base controls now use the V1 coral,
cream, typography, radius, focus, and responsive spacing system. Login keeps
the existing sign-in and sign-up behavior while adding clear form hierarchy,
error treatment, native autocomplete, and submit-pending feedback. The
assignment-aware workspace chooser remains unchanged in behavior and now uses
clearer destination cards.

Giver inherits the shared V1 baseline and no longer uses a nested generated
layout; Partner keeps its counter-first treatment, while Organization and
Admin retain their role-specific operational shells. Shared headers, forms,
buttons, cards, focus states, narrow navigation, and organization loading/error
states now use consistent V1 presentation tokens. No auth routing, role or
assignment eligibility, backend authority, or product behavior changed.

Local validation passed web TypeScript, 18 focused auth and role presentation
tests, and `git diff --check`. Browser validation confirmed the login form and
Giver presentation boundary with a local QA account and cleared the session.
The available fixture routes to the student handoff and lacks an assigned
Partner membership, so fully authenticated Partner, Organization, and Admin
visual rechecks remain manual QA with suitable role fixtures.

## GIVER OUTCOME FOUNDATION
The Giver outcome foundation and V1 My Giving UI are implemented locally in
additive migration `0017_giver_outcome_read.sql`. The new
`list_my_giving_outcomes()` SECURITY DEFINER RPC is authenticated and
self-scoped through `giver_orders.giver_id = auth.uid()` only; it accepts no
giver parameter and does not provide Admin or Partner bypass. It returns only
the reviewed order/item, offer, funded-quantity, outcome, aggregate activity,
and coarse availability fields.

An item receives outcome metrics only when its paid, succeeded order maps
unambiguously to exactly one trusted matching campaign. Missing, duplicated,
pooled, or otherwise inconsistent mappings return `unavailable` with all
activity fields null. Exact outcome activity is suppressed unless both the
funded quantity and distinct participating-student count are at least five;
the RPC returns `privacy_suppressed` and nulls every activity-derived field
together. It does not expose student, claim, credential, timestamp, payment,
or Impact attribution data.

`/giver` now retains the funding catalog and adds My Giving cards for available,
privacy-suppressed, and unavailable outcomes. Local validation passed web
TypeScript, the focused My Giving presentation test, `git diff --check`, and a
public-browser rendering check. Migration `0017` is applied to non-production;
11 focused hosted assertions and authenticated browser checks for available,
privacy-suppressed, and unavailable states passed without exposing student
data or rendering suppressed/unavailable metrics as zero.

## PARTNER REDEMPTION CORE
The authorized Partner workspace now presents a counter-first V1 redemption
flow: scan or enter a code, inspect the server-authoritative result, confirm a
valid redemption once, and immediately return to the next scan. It surfaces
invalid, expired, already-redeemed, wrong-partner, not-yet-valid, unavailable,
and server-error states without exposing backend error detail. Existing QR
technology, `inspect_redemption`/`redeem_claim` authority, partner protection,
and redemption semantics are unchanged. The page includes a small existing-RLS
recent-redemption list with nullable offer/campaign fallbacks. Physical camera
permission and end-to-end authorized-partner QA remain pending.

## PRODUCTION READINESS LATER
- real payments
- production scheduler
- deployment/domain
- monitoring
- release/signing

## DATABASE MAINTENANCE SCHEDULER (2026-10-07)

New ordered migrations `0018` through `0020` implement constrained Impact
system attribution, postgres-only direct Impact maintenance, a private
SECURITY INVOKER runner, and one five-minute Supabase Cron job registered
inactive. Trusted nested join execution and human audit attribution remain
intact. The runner calls claim expiration then Impact expiration atomically.
No historical migrations, RLS, claim inventory logic, reciprocity, contribution,
or expiration predicates were changed. No production credentials were used.
Migrations `0018` through `0020` are owner-confirmed applied to hosted DEV/QA;
the registered Cron job remains intentionally inactive.

Focused validation passed: `npm run test:scheduler` (9 tests), the modified
Batch 2 fixture's Node syntax check, and `git diff --check`. Scheduler tests
use disposable PGlite PostgreSQL and real application migrations; Cron registration uses a test
double because this runtime has no pg_cron worker. Real Supabase Cron worker,
timeout, monitoring, and multi-session concurrency validation remain deployment
gates. See
`docs/guides/database-maintenance.md` for promotion, grants, monitoring, and
the separately flagged existing claim-expiration double-UPDATE CTE issue.

## WEB LOCALIZATION FOUNDATION (2026-10-07)

The web locale has one persisted source: the `cinste_web_locale` cookie. Its
server resolution now lives only in `lib/i18n/server.ts`; it gives a valid saved
locale precedence over `Accept-Language` and otherwise defaults to Romanian.
The root layout, public handoff routes, login, checkout, Partner, and Admin
operations use that resolver. The language selector writes that single cookie
then refreshes the route, so server-rendered and client-navigation refreshes
resolve the same value. No profile, session, URL, or local-storage locale
persistence exists.

The prior inconsistency was caused by direct per-page resolution combined with
literal workspace copy and hard-coded `ro-RO` formatters. The canonical
dictionary now rejects missing keys rather than falling back to Romanian, and
the focused i18n test checks locale persistence precedence plus four-locale
dictionary parity.

The completed shared presentation batch localizes the full Giver catalog,
outcome, checkout-success, and signed-out/error/empty states; Partner redemption
and scanner states; and the account workspace chooser for RO, EN, TR, and AR.
Repeated domain statuses use a parity-tested presentation dictionary without
changing stored enum values or dynamic partner, organization, offer, campaign,
or user content. The later Giver/Partner completion passed web TypeScript plus
10 focused i18n and Giver outcome assertions. Literal Admin workspace copy and
the currently unused QR component remain separate follow-up work.

## AUTHENTICATED LOGO ROUTING (2026-10-07)

The shared wordmark now uses the existing role- and assignment-aware workspace
selection rules. Anonymous users still go to `/`; an account with one eligible
workspace goes to that workspace; and an account with more than one eligible
workspace goes to the existing `/account` chooser. This changes no profile,
assignment, authorization, or routing eligibility behavior.

## ORGANIZATION OPERATOR LOCALIZATION (2026-10-07)

The Organization Operator workspace now uses the shared web locale resolver and
four-locale RO/EN/TR/AR copy for its workspace context, opportunity lifecycle,
participation actions and states, forms, feedback, loading, and error views.
Operator server actions resolve their messages from the same persisted locale
cookie; repeated backend status values use the shared presentation labels; and
dates use the selected locale rather than a fixed `en-GB` formatter. Dynamic
organization, opportunity, and participant data remains unchanged. Dictionary
parity coverage now includes Organization copy and controlled category labels.

## STUDENT + GIVER PUBLIC ACQUISITION (2026-10-07)

The landing page now presents Student, Giver, Partner, and Organization roles
with distinct explanations. Student CTAs enter the existing `/student` mobile
handoff; the handoff retains the root-only `cinste://` boundary and gives a
localized beta/install-guidance state without claiming install detection or an
app-store link. Giver CTAs open the public `/giver` catalog. Partner and
Organization cards are intentionally non-actionable invitation-coming-next
states rather than anonymous links into protected workspaces.

Web auth accepts only `student` and `giver` navigation intent. Its return-path
allowlist is exact `/giver`, `/student`, and `/account`; absolute,
protocol-relative, query, fragment, backslash, encoded, and other paths are
rejected server-side. Matching existing profiles may return to their requested
public path, while conflicting intent and multi-workspace accounts retain
existing workspace resolution. Login never changes a profile role.

Approved new-account Giver provisioning is implemented in additive migration
`0021_giver_signup_provisioning.sql` and the dedicated web Giver signup action.
The service-only issuer creates a 256-bit opaque one-time grant bound to the
normalized email for ten minutes; only its SHA-256 hash is stored in
`cinste_private`. Anonymous and authenticated roles have no private-schema,
table, issuer, or finalizer access. The existing postgres-owned Auth INSERT
trigger now atomically consumes a matching unused grant and inserts a literal
`giver` profile. With no reserved grant metadata it inserts literal `student`;
invalid, expired, replayed, or wrong-email proof aborts the Auth transaction.
The proof is removed from persisted Auth metadata in the same transaction.

The web Giver action accepts only email, password, and display name, issues the
grant through the server-only service client, calls normal Supabase signup, and
uses consumed-grant state rather than the returned user object as creation
authority. Immediate sessions use existing role/assignment-aware routing;
confirmation-required null-session results show localized RO/EN/TR/AR email
confirmation guidance. Existing authenticated accounts, login, callback/session
behavior, URL intent, and return paths do not mutate roles. Native Student
signup remains unchanged and continues to create Student profiles without a
grant.

Local validation passed web TypeScript, 27 focused Giver action/auth-routing/
i18n tests, and 8 disposable PostgreSQL provisioning assertions covering
grants, fixed search paths/ownership, client denial, Student defaults, literal
Giver creation, forged/expired/wrong-email/replayed proof, duplicate signup,
metadata role rejection, token removal, and transactional rollback. Migration
`0021` is owner-confirmed applied to hosted DEV/QA. Hosted validation completed
with 57 assertions; email confirmation is enabled. Remaining acceptance gaps
are the real public `signUp` null-session path, a real confirmation-link
callback and browser route, direct hosted grant-catalog inspection, and true
simultaneous public-signup contention.

## V1 FUNDING ELIGIBILITY (2026-10-07)

The Astra-reviewed cross-role funding correction is implemented as ordered
migration `0022_funding_eligibility.sql`. The web actions require an
authenticated account whose current stored `profiles.role` is literal `giver`
before calling the service client. The database independently applies the same
eligibility check in both `create_mock_checkout` and `confirm_mock_payment`.
Confirmation now accepts the authenticated Giver ID explicitly and locks only
an order whose `giver_id` matches it; RLS visibility is not used as proof of
ownership.

The prior two-argument confirmation signature is removed. Both funding RPCs
retain execute permission only for `service_role`, use postgres ownership and a
fixed safe search path, and disclose only localized safe RO/EN/TR/AR denial
copy through the web actions. Direct INSERT, UPDATE, and DELETE privileges on
`giver_orders`, `giver_order_items`, and `payments` are revoked from anonymous
and authenticated roles, and the prior Admin write policies are removed;
existing self/Admin read behavior is unchanged. Giver provisioning migration
`0021` and V1 role semantics are unchanged, with no Admin funding exception.

Local validation passed the production web build, TypeScript, 14 focused
server-action assertions, 7 i18n assertions, 6 disposable-PostgreSQL funding
tests, and all 8 existing Giver-provisioning tests. Coverage includes Giver,
Student, Partner, and Admin eligibility, cross-user confirmation, current-role
recheck, direct RPC denial, all direct financial-table mutation verbs,
service-only grants, fixed function ownership/search paths, and zero
financial/inventory/event side effects on denial. Migration `0022` is
owner-confirmed manually applied to hosted DEV/QA through the Supabase SQL
Editor and passed 61 owner-run hosted DEV/QA assertions on 2026-10-08. It is not
applied to Production; no separate Production environment exists.
