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
Hosted validation is pending application after migrations `0011` through
`0013`; Batch 4 must be validated together with the Core hosted suite.

## CURRENT NEXT STEP
1. apply and validate Impact migrations `0011`, `0012`, `0013`, and `0014` in the hosted database
2. run the focused hosted suites for Impact Batches 1 through 4 and the relevant Core integration suite
3. do not start Impact Batch 5 or UI work until hosted validation passes

## PRODUCTION READINESS LATER
- real payments
- production scheduler
- deployment/domain
- monitoring
- release/signing
