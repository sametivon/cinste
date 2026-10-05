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
Product rules being documented.
Impact Batch 1 foundation implemented in migration `0011_impact_batch1_foundation.sql`.

Added the additive organization and Impact backend schema, enums, constraints,
indexes, RLS foundations, append-only organization assignment/audit history,
and narrow admin RPCs for organization creation, activation/deactivation, and
operator assignment/revocation. Active `organization_users` assignment plus
active organization status is the organization access authority.

Batch 1 authorization hardening is complete in the same un-applied migration:
internal trigger helpers are non-executable by clients, Impact table privileges
are explicit, and the reciprocity settlement reference has a foreign key.
Focused hosted coverage is prepared at
`scripts/impact-batch1-integration-test.mjs` and skips until migration `0011`
is applied.

Batch 3+ remains: contribution verification/revocation, reciprocity settlement,
supply safeguards, Core claim/redemption integration, and UI.

Batch 2 implementation is prepared in migration
`0012_impact_batch2_opportunity_participation.sql`, with focused hosted
coverage at `scripts/impact-batch2-integration-test.mjs`. Hosted validation is
pending application of migration `0012`.

Batch 3 implementation is prepared in additive migration
`0013_impact_batch3_verified_contributions_reciprocity.sql`, with focused
hosted coverage at `scripts/impact-batch3-integration-test.mjs`. The migration
adds trusted completion provenance, one-time immutable contributions, the
reciprocity settlement ledger, organization/admin verification and correction
RPCs, cycle-safe waiver settlement, lock-ordered transactions, and direct
write/private-helper protections. Batch 2 completion now routes through the
trusted verification transaction, and a student cannot rejoin an opportunity
after earning its lifetime contribution. Hosted validation is pending
application of migration `0013` after the hosted database has migrations
`0011` and `0012` applied.

Batch 4 backend implementation is prepared in additive migration
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

## CURRENT NEXT STEP
Impact Batch 5 UI implementation is complete against the validated Batch 1-4
backend: verified-student mobile Impact browse/detail, join/cancel,
participation/history, reciprocity and verified-contribution metrics, and the
post-redemption pass-it-forward CTA; organization-operator and minimum Admin
Impact operational pages reuse established RPCs and RLS. No Impact migration or
authority/reciprocity/Core transaction change was made.

The remaining Batch 5 web UI gaps are complete: operators can edit drafts via
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
continues to use `list_impact_opportunities`. The non-production database has
not yet applied `0015`; apply it before physical validation of this fix.

Focused web TypeScript checks pass. The repository Vitest suite could not start
in this managed Windows sandbox because Vite/esbuild failed to spawn a child
process with `EPERM`; rerun it in an unrestricted local environment. Mobile
typecheck and the focused i18n/Impact Vitest suites pass (15 tests) when Vitest is run
with the required local Windows child-process permission. Physical QA remains
required for all newly wired student, operator, and admin workflows, especially
self-verification rejection, cross-organization isolation, and post-redemption
foreground refresh.

## CURRENT NEXT STEP
1. complete the listed manual/physical Batch 5 QA before production planning
2. do not expand Impact beyond Batch 5 without an explicit scoped request

## PRODUCTION READINESS LATER
- real payments
- production scheduler
- deployment/domain
- monitoring
- release/signing
