# CINSTE Pilot Acceptance Gate

Status: clean Student fixture authorization and corrected UX pass on the hosted
web routes; other role/device journeys and catalog fixture quality remain open. This is not
Production, legal, payment, or App Store acceptance.

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
| `student-unverified` | Student-only test account with no Student profile or verification, and no active Partner or Organization assignment | Signup, onboarding, verification guidance, protected-route denial, empty/error states. |
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

**Next exact step:** deploy the Giver route-title correction, then recheck the
Student-facing `/giver` title and body on `cinste.vercel.app`. The checkout
success and failed-order recovery states passed hosted browser checks on
2026-10-12. Continue the Partner, Organization, Admin, and device journeys.
Resolve QA-named active offers through fixture-data ownership before a
pilot-facing catalog pass. Do not hide them by name in application code. Do not
submit or approve verification for `student-unverified`.

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

The first result below used the wrong fixture. The later signed-in result is
the hosted rerun with the clean fixture.
Add one row per journey; attach screenshots or redacted notes outside the
repository when they contain account identifiers.

| Date/time | Commit | Fixture | Surface/route | Viewport/device | Result | Severity/defect | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 (owner-reported; time not recorded) | hosted QA deployment (commit not recorded) | Wrong fixture (account not recorded) | `/account`, `/student`, `/organization`, `/partner`, `/admin`, `/giver` | English / desktop browser | Superseded | Organization data appeared during this pass. The owner later identified the account as the wrong fixture. This row provides no evidence about `student-unverified` authorization. | Owner-provided screenshots and redacted route results in session; no account identifiers stored here |
| 2026-10-11 (owner-reported; time not recorded) | hosted QA deployment (commit not recorded) | `unverified.student@cinste.test` | `/account`, `/student`, `/organization`, `/partner`, `/admin`, `/giver` | viewport and locale not recorded | Authorization PASS for protected workspaces; UX FAIL/P2 | `/account` redirected to `/student`; the Student state was sparse. Organization, Partner, and Admin denied access but redirected to landing banners. The public Giver page showed Giver-account language and local MVP payment copy. The earlier Organization exposure was caused by testing the wrong fixture. | Owner-provided manual QA in session; hosted UX correction rerun pending |
| 2026-10-11 | `783e48c` | Signed out | `/giver` | English / desktop browser | Public acquisition layout PASS; catalog FAIL/P2 | The page separates public discovery from Giver history and funding controls. Active offers from inactive QA partners still appear. A repository filter now matches the funding RPC's active-partner rule; hosted recheck is pending. | Agent browser check on `cinste.vercel.app` |
| 2026-10-11 | `8e5245f` | Signed out | `/giver` | English / desktop browser | Public acquisition layout PASS; fixture data FAIL/P2 | The active-partner filter removed inactive-partner offers. QA-named offers with active partners remain visible. Fixture-data cleanup or a dedicated clean QA data set is required before a pilot-facing catalog pass. | Agent browser DOM and viewport check on `cinste.vercel.app` |
| 2026-10-11 19:00 UTC | `8e5245f` code; Vercel deployment `dpl_6XnZYBxohcCso823uMh39YL6JudX` Ready at QA alias | `unverified.student@cinste.test` | `/account`, `/student`, `/organization`, `/partner`, `/admin`, `/giver` | English / desktop 1920 px browser | Student fixture web UX PASS; protected-route authorization PASS; catalog fixture data FAIL/P2 | `/account` stayed on a Student-only hub and showed unverified status. `/student` named the unverified state, explained the verification requirement, and offered the app action. Each denied route stayed on its own page with role-specific reason and Account/Home links; Account and Home recovery navigation worked. Student `/giver` showed discovery with explicit Student/Giver separation and no history or funding controls. QA-named offers with active partners remain visible. No verification was submitted. | Agent signed-in DOM checks and viewport screenshots on `cinste.vercel.app`; Vercel CLI alias inspection |
| 2026-10-11 19:00 UTC | Same QA alias deployment | `unverified.student@cinste.test` | `/student`, `/admin` | Romanian / desktop 1920 px browser | Localization spot-check PASS | Student verification state and Admin denial state rendered Romanian headings, explanations, and recovery actions after switching the web locale. This does not cover every language or viewport. | Agent signed-in DOM checks on `cinste.vercel.app` |
| 2026-10-11 19:22 UTC | `f01ad9f` docs revision with `8e5245f` code; Vercel deployment `dpl_4nKK8Jpc9QBsG9JtcwCVtWaCcvDM` Ready at QA alias | `giver@cinste.test` | `/account`, `/giver` | English / desktop 1920 px browser | Giver read-only web state PASS; checkout PENDING; fixture data FAIL/P2 | `/account` stayed on a Giver-only hub. `/giver` showed My Giving, privacy-suppressed outcome wording, and a checkout section stating no real payment will be charged during the pilot. No funding control was activated. Many repeated historical Cappuccino cards and active QA-named catalog offers remain. | Agent signed-in DOM and viewport checks on `cinste.vercel.app`; Vercel CLI alias inspection |
| 2026-10-12 07:14 UTC | `45c786e` repository revision served by QA alias before copy correction | `giver@cinste.test`; mock order `8c68c527-846a-426f-ae90-b4afe0002543` | `/giver`, `/checkout/[orderId]`, `/giver/success/[orderId]` | English / desktop 1920 px browser | Mock checkout success and return PASS; success copy FAIL/P2; failure/retry PENDING | One-item Cappuccino test order for RON 15.00 reached checkout, stated no real payment would be charged, confirmed as a test contribution, and showed one available experience. Return link reached `/giver`, where a new one-experience My Giving entry appeared. Success page said `1 students` and omitted the no-charge reminder. | Agent browser UI state and screenshot on `cinste.vercel.app` |
| 2026-10-12 07:16 UTC | `f134b27` served by QA alias | `giver@cinste.test`; failed mock order `2cf62c73-2626-4ba5-a2bc-5575bfb9f22b` | `/giver`, `/checkout/[orderId]?failed=1` | English / desktop 1920 px browser | Failure recorded; retry UX FAIL/P2 | The failed attempt returned to checkout with “The unsuccessful attempt was recorded.” The server kept the order failed, but the page still showed “Confirm pilot contribution,” which could not retry that terminal order. A local correction now shows the failure state and directs the Giver to `/giver` for a fresh order; hosted recheck is pending. No real payment was charged and no inventory was added. | Agent browser UI state and screenshot on `cinste.vercel.app` |
| 2026-10-12 07:35 UTC | `4c78382` served by QA alias | `giver@cinste.test`; existing paid and failed mock orders | `/giver/success/[orderId]`, `/checkout/[orderId]?failed=1`, `/giver` | English / desktop browser | Checkout copy and failure recovery PASS; mock-funding journey remains partial | The paid order showed singular copy, a no-real-payment statement, RON 15.00, and one available experience. The failed order showed its terminal result and no confirm action. The recovery destination `/giver` loaded. This is mock-funding evidence, not payment acceptance. Existing repeated Cappuccino history remains. | Agent browser DOM checks on `cinste.vercel.app` |
| 2026-10-12 07:35 UTC | `4c78382` served by QA alias | `student-unverified` | `/account`, `/student`, `/organization`, `/partner`, `/admin`, `/giver` | English / desktop browser | Student account, verification, denial, and role separation PASS; catalog fixture data FAIL/P2 | The account stayed on the Student-only hub. The Student page named the unverified state, explained why verification is required, and gave the app action. Organization, Partner, and Admin each showed a route-specific denial with Account/Home links. Giver discovery showed no history or funding controls. QA-named offers remain. The browser title still said “My Giving”; a neutral repository title is now in review and is not yet deployed. | Agent browser DOM checks on `cinste.vercel.app` |
| 2026-10-12 07:35 UTC | `4c78382` served by QA alias | `student-pending`; `student-verified` | `/student`, `/account` | English / desktop browser | State rendering PASS; full Student journey PENDING | Pending Student showed “Your verification is under review” and a clear next step. The verified Student reached the mobile handoff. Its account hub also listed Organization Operator access. The role model permits this combination, so confirm whether the fixture assignment is intentional before treating it as a Student-only fixture. No verification action was taken. | Agent browser DOM checks on `cinste.vercel.app` |
| 2026-10-12 07:35 UTC | `4c78382` served by QA alias | `partner-assigned` | `/partner`, `/admin` | English / desktop browser | Workspace access PASS; operational journey PENDING; data clarity FAIL/P2 | The assigned Café Partner opened its workspace. Recent-history fields displayed “Unavailable.” A Partner account visiting `/admin` received the dedicated Admin denial state with Account/Home links. No scan, redemption, or draft submission was performed. | Agent browser DOM checks on `cinste.vercel.app` |
| 2026-10-12 07:35 UTC | `4c78382` served by QA alias | `admin-ops` | `/admin` | English / desktop browser | Admin overview PASS; acceptance PENDING; fixture data FAIL/P2 | The overview loaded with 36 attention items and QA-labelled Student, Impact, Organization, and inventory records. No review or moderation action was taken. Clear the QA data through its owner before using this queue for pilot acceptance. | Agent browser DOM check on `cinste.vercel.app` |

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
