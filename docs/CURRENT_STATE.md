# docs/CURRENT_STATE.md

# CINSTE Current State

## COMPLETE
- Core backend hardening implemented
- student verification lifecycle implemented
- trusted mock funding flow implemented
- claim validity and expiration hardening implemented
- partner/offer/campaign admin operations implemented
- QR redemption implemented
- partner assignment controls implemented
- mobile student app implemented
- mobile role/auth gate implemented
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
Approved V1 product rules are recorded in `docs/impact/IMPACT_SPEC.md`.
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

## CURRENT NEXT STEP
1. complete the listed manual/physical Batch 5 QA, including multi-organization
   switching, verification-loss history, localized error states, and review
   requests
2. do not expand Impact beyond Batch 5 or begin production planning until those
   acceptance checks pass

## PUBLIC LANDING PAGE
The public landing page has a presentation-only redesign using the provisional
V1 brand and `docs/design/DESIGN_SYSTEM.md`. It explains experience funding,
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
clearly marked as CINSTE Admin review with no operator resolution control.
Existing create/edit/publish/cancel and authoritative server actions are
unchanged. Loading, query-error, empty, success, and action-eligibility copy
are explicit; failures do not render as an empty action queue.

Local validation passed web TypeScript, eight focused Organization workspace
tests, `git diff --check`, and an authenticated browser check using an existing
single-assignment QA operator. The browser check confirmed selected-organization
rendering, empty-queue/history states, opportunity lifecycle grouping, the
create form, and no horizontal overflow at 360px and 768px. Multi-organization
browser switching remains a manual QA item because the available QA account
had one active assignment; the existing selection tests cover server-authorized
selection and invalid requested IDs.

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
public-browser rendering check. The migration is not yet applied to
non-production, so authenticated hosted RPC assertions and authenticated
browser outcome-state validation remain pending. After an owner-authorized
non-production apply, run `npm run test:integration:giver-outcomes`.

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
