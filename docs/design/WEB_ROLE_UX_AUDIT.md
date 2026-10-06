# CINSTE Web Role UX Audit (V1)

**Status:** Product and UX audit only. No screen implementation, behavior, or
authorization change is implied by this document.

## Scope and method

This audit covers the existing web routes for Auth, Giver, Partner,
Organization Operator, and Admin. It distinguishes presentation problems from
missing frontend use of an existing contract and genuine backend gaps. Student
web remains a mobile-app handoff and is intentionally out of scope.

The V1 design system applies to all future work: Giver may be warm and
outcome-led; Partner, Organization, and Admin should be fast, restrained, and
operational.

## Auth and login

### Current state

`/login` combines email/password sign-in and account creation. Errors return
through a query parameter. `/account` and successful login route by the stored
profile role: Admin, Partner, and Giver go to their role surface; Student goes
to the native-app handoff. Signup currently leads to the same student
onboarding/handoff path.

### Existing backend capabilities

- Supabase password sign-in and signup are wired.
- Profile-role routing is already authoritative in the application.
- Organization access is an additive active `organization_users` assignment,
  rather than a profile role; the existing authorization model can support an
  assignment-aware destination without changing roles.
- The existing roles are fixed by the product model; this is not an invitation
  to add a second role system.

### UX gaps

- The combined form is visually and structurally older than the landing page.
- It has limited guidance about which role should use which route.
- Loading, field-level validation, retry, and success/confirmation states are
  minimal.
- There is no password-recovery flow in the application.
- The current destination helper only reads `profiles.role`, so an assigned
  Organization Operator with a student profile routes to the student handoff
  instead of `/organization`.
- The signup destination can be confusing for a prospective giver or partner;
  self-service role selection should not be inferred.

### V1 screen architecture

| Screen/view | Purpose and primary action | Critical information | Status | Type | Priority |
|---|---|---|---|---|---|
| Sign in | Return an existing user to the correct role surface. | Email, password, error, loading, role-specific destination after sign-in. | exists | presentation-only | P1 |
| Create account | Create a default account without implying a role change. | What signup does and does not grant; student app handoff. | partial | presentation-only | P1 |
| Recovery request | Let a user request a password reset. | Email, confirmation, safe generic error. | missing | frontend behavior; verify hosted auth email configuration | P1 |
| Workspace destination | Route an assigned operator, or let a legitimately multi-context account choose a workspace, without mutating a role. | Permitted workspaces and why they are available. | missing | frontend behavior | P0 |
| Access boundary | Explain no-access/incorrect-role outcomes and give the safe next step. | No authorization detail or internal IDs. | partial | presentation-only | P1 |

### What to defer

Do not add a role picker, partner self-enrollment, or a student web product.
Those would change product and authorization decisions rather than polish auth.

## Giver

### Current state

`/giver` lists active offers, lets a signed-in giver choose a quantity, and
starts the trusted mock checkout. Checkout confirms payment and creates
campaign inventory through the existing server-only path. The success page
shows the immediate funded quantity and current available inventory, then
returns the giver to funding.

### Existing backend capabilities

- Active offers, categories, partners, and trusted prices are readable.
- A service-only checkout creates orders/items; payment confirmation creates
  campaign inventory from trusted data.
- A giver can read their own orders, items, and payments.
- Campaigns retain `giver_order_id`, quantity totals, and availability.

### UX gaps

- The catalog is functional but feels like a development form rather than an
  experience-led funding choice.
- There is no giver home/history, so a giver cannot revisit what they funded.
- The success view is useful only immediately after checkout and does not
  explain campaign progress over time.
- The product does not currently expose claimed or redeemed outcomes to the
  giver, so the emotional outcome loop stops at payment.

### V1 screen architecture

| Screen/view | Purpose and primary action | Critical information | Status | Type | Priority |
|---|---|---|---|---|---|
| Fund experiences | Choose an existing active offer and quantity. | Experience, partner, category, price, quantity, fulfillment context. | exists | presentation-only | P1 |
| Checkout and confirmation | Confirm the existing trusted funding action and explain the immediate result. | Order summary, safe payment state, funded quantity, next step. | exists | presentation-only | P1 |
| My giving | Return to previous contributions and fund again. | Own paid/pending/failed orders, items, funded quantity, and safe aggregate outcome counts. | missing | backend gap + frontend behavior | P0 |
| Contribution outcome | Show an individual contribution's progress without student identity. | Funded, remaining, claimed, redeemed, and concise Impact outcome where authorized. | missing | backend gap for a self-scoped aggregate/read projection | P1 |

### Backend gap

The current RLS model permits own orders/items/payments, but it does not grant a
giver a safe historical view of the downstream claims and redemptions connected
to their campaigns. A future solution should be a narrow self-scoped projection
or RPC returning aggregate counts only; it must not relax claim, campaign, or
redemption RLS and must not reveal student identities or redemption credentials.

### What to implement now vs defer

The P0 giver foundation is a narrow self-scoped outcome aggregate, then My
giving and its detail view. It must return only the giver's own order/campaign
totals and aggregate claimed/redeemed counts. Do not add financial analytics,
social feeds, direct giver/student contact, or recurring funding in V1.

## Partner

### Current state

`/partner` requires an authenticated `partner_users` membership. It already
has camera scanning, manual credential entry, server-authoritative inspection,
redeem confirmation for a valid credential, and a recent-redemption list.
The current presentation exposes raw states and uses a single, vertically
stacked page.

### Existing backend capabilities

- `inspect_redemption` returns validation state and safe offer/partner context.
- `redeem_claim` is the authoritative, partner-authorized redemption boundary.
- The server already differentiates valid, invalid, expired, already redeemed,
  not-yet-valid, and wrong-partner outcomes.
- `redemption_events` records the redeeming partner user and supports recent
  partner history.
- Staff access already exists: Admin assigns and revokes multiple
  `partner_users` per partner. A staff-management product is not required for
  this to work.

### UX gaps

- The counter flow is functional but not optimized for a student waiting at a
  counter: scan, result, confirmation, and return-to-scan are not visually
  distinct enough.
- Validation results are raw server labels rather than clear operational
  states with the correct next action.
- Camera permission, scanner failure, manual-entry format, and post-redeem
  success feedback need explicit states.
- Recent activity is present but not clearly scoped when a staff member has
  more than one partner assignment.
- There is no concise "my partner" offer/campaign availability context.

### V1 screen architecture

| Screen/view | Purpose and primary action | Critical information | Status | Type | Priority |
|---|---|---|---|---|---|
| Redeem | Fast default counter surface: scan or enter a code. | Partner context, camera/manual fallback, clear focus, permission/error state. | partial | presentation-only + frontend behavior | P0 |
| Validation result | Decide whether to confirm redemption. | Explicit valid/invalid/expired/already redeemed/wrong partner/not-yet-valid result, offer and partner when safely returned. | partial | presentation-only | P0 |
| Redemption confirmation | Perform the existing authoritative redeem action, then return to the next scan. | Clear success, duplicate-submit protection, no credential disclosure. | partial | presentation-only + frontend behavior | P0 |
| Recent redemptions | Give staff confidence and a short operational trail. | Time, offer/campaign fallback, final state, partner scope. | exists | presentation-only | P1 |
| Partner inventory context | Orient staff without turning this into a dashboard. | Assigned partner, active offers/campaigns, remaining availability where readable. | missing | frontend behavior | P1 |
| Partner context selector | Avoid ambiguity for a staff account assigned to multiple businesses. | Selected partner and available assignments; redemption remains authoritative. | missing | frontend behavior | P1 |
| Staff access | Enable staff assignments. | Assigned people and revocation audit. | partial (Admin only) | presentation-only for Admin; self-service is a product decision | P2 |

### What to implement now vs defer

Partner counter redemption is the only P0 in-person counter-flow gap. It needs no POS
integration and no new redemption authority. Implement it as a responsive web
or PWA-friendly workflow. Defer self-service staff administration, POS
integration, settlement reporting, and a large partner analytics dashboard.

## Organization Operator

### Current state

`/organization` is already a scoped Impact workspace. It selects an assigned
organization, creates and edits drafts, publishes/cancels opportunities, and
groups participants into action, review, and history. It supports completion
verification and an excusal path. It also supports multi-organization
selection.

### Existing backend capabilities

- Organization-scoped create, update, publish, and cancel RPCs are present.
- Organization users can verify completion and resolve permitted participation
  outcomes; server rules enforce scope and prohibit self-verification.
- Opportunity and participation lifecycle data is readable only in the
  authorized organization context.

### UX gaps

- The working surface is a single long page, so daily actions compete with
  opportunity history and setup.
- Participation cards show minimal context and lack stronger due/review
  prioritization.
- The UI exposes excusal but not the existing `no_show` resolution path.
- Empty, error, and success patterns are improved but need a final operational
  consistency pass rather than more domain features.

### V1 screen architecture

| Screen/view | Purpose and primary action | Critical information | Status | Type | Priority |
|---|---|---|---|---|---|
| Organization switcher and overview | Establish the active organization and next action. | Organization status, drafts, published work, action/review counts. | partial | presentation-only | P1 |
| Opportunity list/detail | Create, edit draft, publish, or cancel within existing lifecycle rules. | Status, capacity, timing/due date, mode, participant count, immutable-state guidance. | partial | presentation-only | P1 |
| Participant work queue | Verify completion or resolve an eligible outcome quickly. | Opportunity, joined/due timing, status, required reason, self-verification boundary. | partial | frontend behavior + presentation-only | P0 |
| Participation history | Find prior outcomes without crowding the action queue. | Status, completed/resolved time, opportunity context. | partial | presentation-only | P2 |

### What to implement now vs defer

No new backend capability blocks a V1 operator polish. Expose the already
supported no-show outcome only after confirming its product copy and
operational presentation. Defer exports, bulk actions, messaging, scheduling
integrations, and organization self-onboarding.

## Admin

### Current state

Admin has four functional areas: a compact overview with verification review,
catalog/partner/campaign management, read-only Core operations, and an Impact
workspace for organizations, assignments, participation review, contributions,
and reciprocity exceptions.

### Existing backend capabilities

- Admin can review student verification, manage catalog records, partners,
  partner assignments, and campaign scheduling/status through existing
  protected actions/RPCs.
- Read models already cover claims, orders, payments, redemptions, and partner
  access history without exposing QR secrets.
- Impact supports organization lifecycle and assignment, participation
  verification, contribution correction, overdue review visibility, and
  current-cycle reciprocity waivers.

### UX gaps

- The four areas are technically capable but feel like separate utilities,
  rather than one clear operations workspace.
- The overview does not prioritize a unified action queue: pending
  verification, campaign/inventory attention, payments, and Impact exceptions
  require manual navigation and interpretation.
- Read-only tables are useful but have limited filters, record context, empty
  states, and links to the action that can resolve an issue.
- Catalog and partner assignment management are form-heavy and do not make the
  operational consequences of deactivation or campaign state immediately
  scannable.

### V1 screen architecture

| Screen/view | Purpose and primary action | Critical information | Status | Type | Priority |
|---|---|---|---|---|---|
| Operations overview | Direct staff to the smallest set of work needing attention. | Pending verifications, failed/pending funding, active inventory/campaign attention, redemption/Impact exceptions. | partial | presentation-only + frontend behavior | P0 |
| Verification queue | Review a student verification safely. | Applicant context, protected document link, approve/reject reason, final state. | exists | presentation-only | P0 |
| Catalog and campaign management | Maintain partners, offers, categories, availability state, and campaign scheduling. | Lifecycle constraints, remaining/total inventory, assignment status, impact classification where applicable. | exists | presentation-only | P1 |
| Core operations history | Diagnose claims, orders, payments, redemptions, and partner access without secrets. | Safe identifiers, status, timestamps, partner/campaign context, filters. | exists | presentation-only | P1 |
| Impact operations | Run organization, participation, contribution, and reciprocity exceptions. | Current context, documented reasons, limited exception actions. | exists | presentation-only | P0 |
| Alerting/incident view | Surface persistent system failures or monitored anomalies. | Trusted event/monitoring data and ownership. | missing | backend/observability capability gap | P2 |

### What to implement now vs defer

Prioritize information architecture, queues, links, filters, and consistent
operational states over new Admin authority. Defer live monitoring, custom
reporting, bulk lifecycle changes, and enterprise-style dashboards until a
trusted observability/read model exists.

## Cross-role navigation model

- **Public entry:** Landing routes prospective givers to `/giver`, partner and
  organization users to their operational routes, and students to the native
  app explanation/handoff. It must not imply that students have a web product.
- **Authentication:** An unauthenticated protected route returns to that route
  after a safe successful login. Otherwise, `/login` and `/account` must use
  profile role plus active organization assignment. An account with more than
  one permitted workspace gets a small chooser; this never mutates a role or
  assignment. A missing/invalid context is an access-boundary state, not a
  generic dashboard.
- **Giver:** Funding catalog -> checkout -> contribution confirmation -> My
  giving (when available) -> fund again. Do not route to student claims.
- **Partner:** Sign in -> partner context -> redeem -> validation -> confirm ->
  success -> next scan; recent activity remains one step away.
- **Organization:** Sign in -> selected organization -> action queue or
  opportunities -> same selected-organization context after mutation.
- **Admin:** Sign in -> operations overview -> the targeted queue/workspace ->
  return to that queue after a completed action.
- **Global navigation:** Public navigation should not become a role dashboard.
  Authenticated operational surfaces need concise role-local navigation and a
  visible account/logout path; preserve narrow-web usability.

## Recommended implementation order

1. **Auth consistency and destination selection (P0):** Apply V1 form and
   state patterns, preserve requested-route return, and add
   assignment-aware/workspace routing without changing authorization.
2. **Partner operational core (P0):** Redesign the existing scan/manual-code,
   validation, confirm, and success loop around the server-authoritative
   redemption contract.
3. **Giver outcome foundation (P0):** Specify and separately deliver the
   narrow aggregate backend read model, then ship My giving and contribution
   outcome views without exposing student or credential data.
4. **Organization Operator (P0/P1):** Separate daily action/review work from
   opportunity management and expose supported participation outcomes clearly.
5. **Admin (P0/P1):** Unify navigation and triage across existing workspaces;
   improve filters and record context without adding authority.
6. **Cross-role consistency pass (P1):** Apply shared tokens, status states,
   responsive behavior, keyboard/focus treatment, localization, and empty/
   error/loading patterns.

## Summary decisions

- The role surfaces are not merely visually outdated: Giver lacks a
  longitudinal outcome experience, Partner needs a counter-optimized
  redemption flow, and login misses additive Organization Operator access.
- **Giver** has the largest V1 product gap because meaningful claimed/redeemed
  outcome reporting is unavailable under current safe read policies. Partner
  has the largest immediate in-person operational UX gap, but its authoritative
  backend contract is already sufficient.
- P0 work is assignment-aware Auth destination, the Partner redemption loop,
  the Giver outcome aggregate and views, the Organization participant queue,
  and Admin operational navigation/queues. Existing verification and Impact
  action screens are P0 surfaces to retain and polish, not missing authority.
- No backend gap blocks Partner, Organization, Admin, or baseline Giver UI.
  Giver claimed/redeemed outcome counts and Admin anomaly alerting require new
  narrow, security-reviewed read capabilities before UI work should claim
  those data points.
