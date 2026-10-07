---
tur: mevcut
durum: dogrulanmis
kod-kapsami:
  - app/
  - apps/mobile/src/
  - lib/
  - supabase/migrations/
---
# CINSTE Cross-Platform Role Surface Audit

**Audit date:** 2026-10-07

**Mode:** Owner-directed architecture and state analysis. No product feature was
implemented.

## Decision context

The locked platform strategy is recorded in `docs/decisions/project.md`:
CINSTE is mobile-first; Student and Giver core consumer journeys belong in the
native app; Partner and Organization Operator require both web portals and
relevant native operations; Admin remains a web-first control plane; and public
web primarily supports discovery, acquisition, app handoff, login, and portal
entry.

This decision changes presentation ownership, not domain authority. Existing
role, assignment, RLS, RPC, funding, QR, privacy, and Impact decisions remain
authoritative. A client may present an allowed action, but it never becomes the
authority for that action.

## Reconciled repository and environment baseline

- `main` and `origin/main` both pointed to `1595f1b` at audit time.
- Pre-existing untracked `docs/brand/` owner-review assets were present and
  were not changed by this audit.
- The Next.js application contains public/auth routes and functional Giver,
  Partner, Organization Operator, and Admin workspaces.
- The Expo application contains a complete Student-oriented route tree. Its
  mobile router sends every non-Student profile to `role-boundary`; it does not
  resolve Partner or Organization assignments.
- Migrations `0001` through `0022` exist in the repository and are pushed.
  Migrations through `0022` are owner-confirmed applied to hosted DEV/QA;
  `0022` was applied manually through the Supabase SQL Editor and has not
  received hosted behavioral validation. No Production environment is
  evidenced.
- Payments remain mock-only. The scheduler is registered but inactive. No EAS
  production/TestFlight release is evidenced.

## Capability and intended-surface matrix

`Required` means the strategy is not complete until the capability exists on
that surface. `Companion` means useful but not a substitute for the canonical
surface. `No` means no authenticated product is currently intended.

| Role | Web now | Native now | Intended placement | Strategic status |
| --- | --- | --- | --- | --- |
| Student | Public landing, login, onboarding route, offer/claim compatibility routes, and native-app handoff | Verification, Discover, offer/claim, QR/manual code, My CINSTE, Profile, Impact discovery/join/cancel/history/dispute/review | Authenticated core: native-only. Public discovery/auth/handoff: web. | Closest to intended product shape; release and acceptance gaps remain |
| Giver | Public acquisition, dedicated signup, active-offer funding, mock checkout, confirmation, My Giving privacy-safe outcomes | Login ends at a role-boundary message; no Giver routes | Core: native required. Web: acquisition/login plus transitional or complementary funding/outcomes | Largest consumer-surface mismatch |
| Partner | Assignment-protected counter redemption, camera/manual entry, inspection/confirm loop, recent history | Login ends at role boundary; no Partner routes or assignment context | Both: web portal required; native required for on-the-go scan/redeem and concise operational context | Web core exists; native half is absent |
| Organization Operator | Assignment-aware workspace switching, opportunity lifecycle, participant action/review/progress/history, verification and outcome handling | A Student profile with an Organization assignment is still routed only by Student profile state; no operator workspace | Both: web for authoring/broad management; native for daily queue/status/participant operations | Web core exists; additive mobile workspace model is absent |
| Admin | Verification, catalog/partner/campaign management, Core read operations, Impact organizations/assignments/review/contributions/reciprocity, attention overview | Login ends at role boundary; no Admin routes | Web-only unless a later owner decision approves a concrete native need | Functional utilities exist, but the comprehensive control-plane target is incomplete |

## Student

### Existing web and native capability

Web intentionally points Students toward native. It provides discovery copy,
Student signup/login, `/student` app handoff, and compatibility routes for
offers/claims. Native provides the actual consumer product: account creation,
session restoration, verification upload/status, campaign discovery, claim
creation, claim history, QR/manual redemption credential display, profile,
Impact discovery and participation, dispute/review requests, reciprocity state,
and contribution metrics.

### Gaps and backend capability without adequate UI

- Acquisition stops at a custom-scheme handoff with beta guidance; there is no
  store listing, verified universal/app link, install detection, or deferred
  deep-link continuation.
- Password recovery, confirmation-link completion, legal/support entry points,
  account deletion, and production notification/return mechanisms are absent.
- Mobile auth is Student-default signup only. That is correct for Student
  signup but the shared app has no explicit role-intent entry model yet.
- Existing Student backend contracts are substantially represented in native.
  The main missing work is release-quality acquisition/auth/return behavior,
  not a parallel Student web product.

### Journey audit

| Stage | State |
| --- | --- |
| Acquisition | Public Student explanation and handoff exist; production store/deep-link path is missing |
| Authentication | Native email/password login/signup exists; recovery and confirmed-email callback acceptance are missing |
| Onboarding | Native verification submission/status/resubmission exists |
| First value | Verified Student can discover and claim an experience; unverified state is guided to verification |
| Daily operation | Claims, QR, Impact, status refresh, and history exist |
| Return path | Foreground refresh exists; push reminders, durable deep links, and release channel do not |

**Placement:** keep the authenticated Student product native-only. Keep public
web discovery, auth entry, and handoff. Do not build a duplicate Student web
workspace.

## Giver

### Existing web and native capability

Web has the most complete Giver implementation: public role acquisition,
Giver-specific secure signup provisioning, login intent, active-offer catalog,
server-controlled mock order creation/payment confirmation, success, and My
Giving cards backed by the privacy-safe `list_my_giving_outcomes()` RPC.
Native has no Giver route, shell, catalog, funding, checkout, confirmation,
history, or outcome view.

### Gaps and backend capability without adequate UI

- The existing catalog reads and self-scoped Giver outcome RPC can support a
  native read journey, but no native UI consumes them.
- Giver provisioning is implemented only through a Next.js server action. The
  mobile signup form creates ordinary Student accounts, so it cannot safely be
  reused for Giver acquisition.
- Mock funding RPCs are correctly service-only. Native cannot call them
  directly without violating the funding trust boundary; a reviewed native
  server/BFF contract or secure web handoff is required.
- There is no native post-confirmation routing, order/payment state handling,
  retry/cancel treatment, or return-to-fund loop.
- Real payment provider, signed webhook, reconciliation, refunds, and
  production payment operations do not exist on any surface.

### Journey audit

| Stage | State |
| --- | --- |
| Acquisition | Public web explains Giver value and enters `/giver`; no app-first/deferred handoff |
| Authentication | Secure web Giver signup exists; native Giver provisioning/recovery does not |
| Onboarding | No short native Giver orientation, consent, or first-funding setup |
| First value | Web mock funding works; native cannot complete funding |
| Daily operation | Web My Giving exists; native history/outcomes and fund-again loop do not |
| Return path | No native notifications, deep links, saved continuation, or campaign/outcome re-entry |

**Placement:** Giver core must exist in native and should be treated as the
canonical consumer experience. Preserve the current web flow during transition
as acquisition conversion and a complementary/fallback surface; do not remove
it before native parity and an explicit retirement decision.

## Partner

### Existing web and native capability

Web resolves authenticated `partner_users` membership and provides camera or
manual credential entry, `inspect_redemption`, explicit result handling,
confirmation through `redeem_claim`, immediate reset, and recent redemptions.
Native has no Partner routes and discards Partner context at the role boundary.

### Gaps and backend capability without adequate UI

- The authoritative inspect/redeem RPCs already support an authenticated native
  client; no new redemption semantics are required.
- Partner assignments and RLS-scoped redemption history exist but have no
  native presentation.
- Multiple Partner assignment context is displayed as joined names on web; it
  is not a clear selector and no native selector exists.
- Concise inventory/offer availability and operational issue guidance are not
  presented as a dedicated Partner capability on either client.
- Public Partner acquisition/onboarding authority and first entry remain an
  owner decision. Admin assignment remains the only approved access authority.
- Physical authorized-camera and end-to-end revocation acceptance remain
  incomplete; hosted RPC success is not device acceptance.

### Journey audit

| Stage | State |
| --- | --- |
| Acquisition | Public role card is non-actionable; onboarding authority is undecided |
| Authentication | Shared web login works; native login blocks at role boundary |
| Onboarding | Admin assignment exists; no accepted-invite/first-partner context journey |
| First value | Web redemption core exists; native first scan does not |
| Daily operation | Web scan/redeem/history exists; native scan, context, and recent status are absent |
| Return path | Web login can return to workspace; no native quick reopen/deep link/permission recovery |

**Placement:** keep the required web portal. Add native scan/manual redemption,
clear server result/confirm/success states, assignment context, and concise
recent activity. Portal-scale administration and broad history remain web;
redemption can exist on both.

## Organization Operator

### Existing web and native capability

Web resolves active `organization_users` assignments independently of profile
role. It supports multi-organization selection, draft/create/update/publish/
cancel, action and review queues, completion verification, no-show/excusal,
contribution context, and history. Native has no assignment-aware workspace
resolver or operator routes.

### Gaps and backend capability without adequate UI

- Existing authenticated RPCs already authorize opportunity lifecycle,
  completion verification, and outcome resolution. RLS already limits reads to
  assigned organizations. These contracts are not used by native.
- A user may be both a Student and Organization Operator, but mobile routing
  currently considers only the stored profile role. It cannot choose or switch
  additive workspaces.
- There is no native daily action queue, participant detail, verify/resolve
  action, organization switcher, or timely status view.
- Public Organization acquisition is non-actionable. Onboarding and activation
  remain correctly Admin/CINSTE-controlled, but the public interest/contact
  entry has not been decided.
- No notifications or deep links return an operator to urgent/review work.

### Journey audit

| Stage | State |
| --- | --- |
| Acquisition | Public role explanation exists without an action; interest-entry policy is undecided |
| Authentication | Web login and additive workspace selection exist; native ignores assignments |
| Onboarding | Admin create/activate/assign exists; operator acceptance/orientation is minimal |
| First value | Web can create/publish or act on a participant; native has no operator value |
| Daily operation | Web is functionally broad; native queue, verify/resolve, status, and switching are absent |
| Return path | Web preserves selected context per request; native notifications/deep links/context restoration are absent |

**Placement:** keep authoring, lifecycle management, broad history, and
multi-record work in the web portal. Add native workspace choice, organization
context, daily action/review queue, participant completion/outcome handling,
and concise opportunity status. High-risk or rare administrative corrections
remain web/Admin.

## Admin

### Existing web and native capability

Web has an attention overview and separate verification, catalog/Partner/
campaign, Core operations, and Impact operations areas. It can review protected
verification documents; manage categories, universities, Partners, offers,
campaigns, Partner assignments, Organizations, and Organization assignments;
inspect Core activity; verify/correct Impact records; and apply documented
current-cycle reciprocity exceptions. Native has no Admin capability, as
intended.

### Gaps and backend capability without adequate UI

- Existing admin reads, audit tables, lifecycle RPCs, and exception actions are
  distributed across utilities rather than presented as a system-wide control
  plane with unified navigation, search, entity context, and case history.
- The overview covers selected queues but not complete operational health:
  Auth, scheduler, payment/webhook, inventory, migration/deployment,
  observability, incident, and support states are absent or have no trusted
  backend source yet.
- Literal mixed-language Admin copy, limited filters, weak record linking, and
  incomplete audit-event presentation constrain daily operations.
- There is no support/case-management workflow, account/data-deletion control,
  production promotion control, or monitored incident surface. Several require
  owner decisions and Astra review, not just UI.

### Journey audit

| Stage | State |
| --- | --- |
| Acquisition | Not public/self-service by design |
| Authentication | Protected web routing exists; production-grade recovery/MFA/session policy is not evidenced |
| Onboarding | No explicit Admin onboarding/runbook-in-product; access provisioning is operationally external |
| First value | Existing queues and workspaces enable immediate operations |
| Daily operation | Major domain actions exist, but navigation, search, audit context, system health, and exception ownership are incomplete |
| Return path | Web workspace is reachable; alert-to-record links, saved context, and incident ownership are absent |

**Placement:** keep Admin web-only. Evolve it into the comprehensive operational
control plane; do not add native Admin merely for parity.

## Cross-cutting architecture implications

1. **One identity, multiple permitted workspaces.** Native routing must stop
   equating `profiles.role` with the only available mobile surface. It must
   combine the stored profile role with active Partner/Organization assignments
   while leaving authorization to RLS/RPCs.
2. **Shared contracts, not duplicated business logic.** Native and web clients
   should use the same domain status vocabulary and server-authoritative
   operations. Client route guards and presentation are not permission checks.
3. **A trusted mobile funding edge is missing.** Service-only Giver
   provisioning and mock funding cannot move into the app bundle. The native
   journey needs an Astra-reviewed BFF/edge or secure browser handoff contract;
   real payments need their separately approved architecture.
4. **Deep links are trust boundaries.** App handoff, confirmation links,
   Partner scan inputs, and return routes must be allowlisted, non-authoritative,
   and reviewed before production rollout.
5. **Release evidence is surface-specific.** Web tests, hosted RPC assertions,
   and browser QA do not prove native camera, app-link, notification, or device
   acceptance.
6. **No backend broadening for convenience.** Do not relax Giver privacy,
   direct-table RLS, Organization assignment checks, Partner redemption scope,
   Admin controls, or the funding boundary to accelerate native UI.

## Existing work now classified as transitional or incomplete

- The Giver web catalog, mock checkout, confirmation, and My Giving are valid
  capabilities but are transitional/complementary until the complete native
  Giver journey exists.
- The mobile `role-boundary` behavior is obsolete as a final product boundary.
  It remains a safe temporary denial screen, not the intended behavior for
  authorized Giver, Partner, or Organization Operator accounts.
- Partner web redemption is a valid required portal capability, but Partner
  product completion now also requires native operations.
- Organization web workspace completion no longer means cross-platform
  Operator completion; native daily operations are missing.
- Admin V1 pages are an operational foundation, not the comprehensive CINSTE
  control plane.
- Public Partner/Organization invitation placeholders are incomplete
  acquisition journeys.
- The archived web-role audit remains historical evidence; its web-only/mobile-
  Student platform assumptions no longer drive the roadmap.

## Prioritized implementation roadmap

### 0. Security and contract design gates

- Obtain Astra review for native Giver provisioning/funding, real payments,
  material Auth/app-link changes, notification telemetry, deletion, and any new
  privileged operational endpoints.
- Keep Partner/Organization native work on existing authenticated RPC/RLS
  contracts unless a separately reviewed gap is proven.

### 1. Native multi-workspace foundation

- Replace the non-Student dead end with a workspace resolver that understands
  Student/Giver profile roles plus active Partner/Organization assignments.
- Add role-local native shells, explicit workspace selection for legitimate
  multi-context accounts, secure session restoration, and allowlisted app-link
  routing.
- Preserve Student verification gating only for Student product routes; do not
  let it suppress an independently authorized Organization workspace.

### 2. Native Giver end-to-end vertical slice

- Deliver native Giver acquisition continuation, secure signup/login,
  experience catalog, trusted funding/checkout, confirmation, My Giving,
  privacy-safe outcomes, fund-again, and return paths.
- Reuse `list_my_giving_outcomes()` unchanged unless a separately reviewed
  contract gap is demonstrated.
- Keep web Giver live during transition. Real-payment architecture remains a
  release blocker and a separate owner/Astra checkpoint.

### 3. Native Partner operational slice

- Deliver assignment-aware Partner context, camera/manual redemption,
  inspect/confirm/success/next-scan flow, permission recovery, and recent
  activity using existing authority.
- Validate on physical devices with authorized fixtures and revocation.

### 4. Native Organization daily-operations slice

- Deliver workspace/organization switching, action and review queues,
  participant context, completion verification, no-show/excusal handling, and
  concise opportunity status.
- Keep complex opportunity authoring and broad history in the web portal until
  a concrete on-the-go need justifies native expansion.

### 5. Admin control-plane evolution

- Unify navigation, global/entity search, action queues, safe record linkage,
  audit context, and exception ownership across Core, funding, Partner,
  Organization, Impact, verification, and access.
- Add system-health/incident surfaces only after trusted observability,
  scheduler, payment, and deployment sources exist. Do not invent client-side
  health authority.

### 6. Acquisition, return, and release completion

- Resolve Partner and Organization public acquisition decisions.
- Add password recovery, confirmation callback acceptance, store/app links,
  role-aware deep links, notifications with privacy controls, legal/support,
  deletion, accessibility, and physical-device acceptance.
- Complete production environments, real payments, monitored scheduler,
  observability, signing/TestFlight, rollout, and rollback evidence.

## Single recommended next implementation workstream

**Native Giver end-to-end vertical slice, beginning with the shared native
multi-workspace foundation and an Astra-reviewed provisioning/funding
contract.**

It closes the largest contradiction between the locked mobile-first strategy
and the current product, proves the shared app can safely support a second role,
reuses the already validated catalog and privacy-safe outcome model, and creates
the routing/auth foundation subsequently needed by Partner and Organization
mobile work. Do not begin the privileged funding mutation path until its trust
boundary is reviewed; do not compensate by granting service-only RPCs to the
mobile client.
