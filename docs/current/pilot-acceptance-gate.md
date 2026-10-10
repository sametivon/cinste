# CINSTE Pilot Acceptance Gate

Status: pilot-readiness execution artifact. This document is not Production,
legal, payment, or App Store acceptance.

Scope: controlled pilot validation using the current QA web host, hosted DEV/QA
Supabase, local/QA mobile bundle, and approved test accounts. Real payments,
legal copy, invoicing, CAEN-dependent commercial behavior, and Production are
out of scope.

## Evidence rules

- Repository tests prove code behavior only.
- Hosted DEV/QA assertions prove non-production database behavior only.
- Browser checks prove the tested account, route, viewport, and data state only.
- Expo Go checks prove the tested device and bundle only.
- Mock funding must be labelled mock and must not be reported as payment
  acceptance.
- A role or journey is not accepted when its intended surface is missing; mark
  it `BLOCKED — missing surface`.
- Record account IDs, environment, commit SHA, date/time, route, viewport or
  device, fixture IDs, expected result, actual result, and evidence location.

## Fixed QA fixture set

Use stable fixture labels. Store credentials and secrets only in the approved
local/QA secret store; never commit them to this document or the repository.

| Fixture label | Required state | Purpose |
| --- | --- | --- |
| `student-unverified` | 18+ test Student with pending/unverified verification | Signup, onboarding, verification guidance, protected-route denial, empty/error states. |
| `student-verified` | Admin-verified 18+ Student with at least one eligible Core offer and one low-risk Impact opportunity | Core discovery/claim, Impact discovery/join/cancel/history, completed contribution and reciprocity presentation. |
| `student-impact-history` | Verified Student with completed, attended-only, cancelled, no-show/late-cancel, excused, and disputed Impact records where safe fixtures exist | History clarity, authoritative status, incident/dispute/review states, no self-completion. |
| `giver-web` | Stored `giver` profile with active offers and mock checkout access | Public acquisition, Giver signup/login, catalog, mock checkout, success/failure, My Giving states. |
| `giver-native` | Stored `giver` profile with native workspace access | Workspace resolver, Offers, My Giving, Account, privacy states, sign-out; funding remains unavailable until PKCE/BFF gate is cleared. |
| `partner-assigned` | Active Partner assignment with at least one valid, expired, wrong-Partner, already-redeemed, and unavailable redemption fixture | Web inspection/manual redemption, error handling, assignment scope, recent history. |
| `organization-single` | Active verified Organization with assigned operator and draft, pending-review, published, scheduled, flexible, cancelled, and completed opportunities | Organization workspace, lifecycle, participant operations, attendance/completion, incidents. |
| `organization-multi` | Operator assigned to two active Organizations with non-overlapping records | Workspace switching, scoped reads, no cross-organization leakage. |
| `admin-ops` | Admin account with pending Student verification, Impact review, Organization review, incidents, and catalog attention items | Admin queues, moderation, corrections, audit context, safe empty/error states. |
| `impact-low-risk` | Approved low-risk Bucharest opportunity with capacity, 18+ eligibility, structured details, and no prohibited activity | Student discovery, join, cancellation deadline, Organization participant projection, attendance/completion. |

## Role and journey acceptance matrix

Status values: `PENDING` means manual evidence is required; `BLOCKED` means the
intended surface or external dependency is unavailable; `PASS` requires fresh
evidence recorded in the run log below.

| Area | Surface | Journey | Current status | Acceptance requirement |
| --- | --- | --- | --- | --- |
| Student | Native mobile | Signup/login, verification gate, discover, claim, QR/manual redemption, profile, history, Impact | `PENDING` | Fresh Expo Go run on current bundle using `student-unverified` and `student-verified`; verify loading, empty, error, narrow layout, and return paths. |
| Student | Web | Public explanation, signup/login, app handoff, confirmation result | `PENDING` | Verify null-session/confirmation path, safe return route, localized messaging, and handoff without granting role authority. |
| Giver | Web | Acquisition, signup/login, catalog, mock checkout success/failure, My Giving | `PENDING` | Run `giver-web`; visibly label mock funding; verify ownership, failure/retry, outcome suppression, and return path. |
| Giver | Native mobile | Workspace chooser, Offers, My Giving, Account, sign-out | `PENDING` | Fresh Expo Go run using `giver-native`; verify safe area, navigation, long content, privacy states, and absence of funding controls. |
| Giver | Native mobile | Funding and confirmation callback | `BLOCKED` | Native-owned PKCE, hosted callback, exact HTTPS allowlist, and real iOS identity are not ready. Do not bypass. |
| Partner | Web | Login, assignment context, inspect, confirm, redeem, recent history | `PENDING` | Run `partner-assigned` with valid and invalid fixtures; verify assignment scope, redemption result handling, and no secret leakage. |
| Partner | Native mobile | Scan/manual redemption and recent operational context | `BLOCKED` | Intended native Partner surface is absent. Record as a pilot capability gap, not a failed test. |
| Organization | Web | Assignment selection, draft/create/edit, submit review, lifecycle, participant actions, attendance/completion, incidents | `PENDING` | Run `organization-single`; verify server-authoritative actions, eligibility, clear errors, and no empty-on-error behavior. |
| Organization | Web | Multi-organization switching and isolation | `PENDING` | Run `organization-multi`; verify every list/action refreshes to the selected assignment and no cross-organization record appears. |
| Organization | Native mobile | Daily action queue, participant status, completion handling | `BLOCKED` | Intended native Organization daily-operation surface is absent. |
| Admin | Web | Verification, Organization/Impact moderation, incidents, corrections, attention overview | `PENDING` | Run `admin-ops`; verify queues, review reasons, audit context, destructive-action confirmation, and no broad secret/profile exposure. |
| Impact | Native + web operations | Low-risk discovery, join, cancel, attendance, completion, no-show/excusal, incident, history | `PENDING` | Run `student-verified`, `student-impact-history`, `impact-low-risk`, and `organization-single`; verify Organization/Admin authority and privacy projection. |
| Public entry | Web | Landing, role explanation, invitation-only Partner/Organization states | `PENDING` | Verify copy is truthful, no dead-end ambiguity, and no public role intent mutates stored role or assignment. |
| Cross-cutting | Web/mobile | Loading, empty, error, narrow viewport, localization, sign-out/session restoration | `PENDING` | Test RO/EN at minimum on web and mobile; record literal/mixed-language or layout defects. |

## Required manual run order

1. Confirm the QA host, current commit SHA, mobile bundle, locale, viewport or
   device, and fixture readiness.
2. Run `student-unverified` through signup/login, onboarding, verification
   guidance, sign-out, and safe return.
3. Run `student-verified` through Core discovery/claim and Impact discovery,
   join, cancel, history, and return paths.
4. Run `giver-web` through acquisition, mock checkout success/failure, and My
   Giving. Do not describe the result as payment acceptance.
5. Run `giver-native` through workspace, catalog, outcomes, Account, navigation,
   long content, and sign-out. Record the funding callback as blocked.
6. Run `partner-assigned` through valid and invalid redemption fixtures.
7. Run `organization-single` through authoring, moderation state visibility,
   participant operations, attendance/completion, no-show/excusal, and incident
   reporting.
8. Run `organization-multi` through switching, refresh, action scope, and
   sign-out/session restoration.
9. Run `admin-ops` through verification, Impact moderation, incident review,
   and audited corrections.
10. Re-run high-risk paths after clearing session/device state and record every
    visible defect with role, route, fixture, viewport/device, and severity.

## Pilot severity

- **P0 — stop pilot:** authority/privacy failure, cross-account or
  cross-organization data exposure, incorrect attendance/completion authority,
  credential/secret exposure, destructive data loss, or a broken required
  first-value path.
- **P1 — pilot blocker:** required journey cannot complete, role cannot operate
  its approved surface, misleading status/payment wording, or repeated crash.
- **P2 — pilot quality:** confusing copy, poor empty/error state, localization
  defect, layout overflow, accessibility issue, or recoverable workflow friction.
- **P3 — later polish:** non-blocking visual refinement or optional convenience.

## Run log

No fresh manual run is claimed by this document yet. Add one row per journey;
attach screenshots or redacted notes outside the repository when they contain
account identifiers.

| Date/time | Commit | Fixture | Surface/route | Viewport/device | Result | Severity/defect | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | Not run | — | — |

## Exit criteria for the next implementation decision

The gate is ready for triage when:

- every available web and mobile surface has a fresh result;
- missing native Partner/Organization and native Giver funding surfaces are
  explicitly recorded as blocked, not silently ignored;
- all P0 issues are closed or the pilot is stopped;
- P1 issues have an owner and decision: fix before pilot or defer with an
  explicit pilot limitation;
- the fixture set covers one successful and one failure/empty state per role;
- privacy and assignment boundaries have fresh evidence;
- the resulting P2/P3 list is ranked before UI cleanup or onboarding changes.

The next implementation batch must be selected from this evidence. Do not start
a broad redesign before the gate identifies the smallest blocking correction.
