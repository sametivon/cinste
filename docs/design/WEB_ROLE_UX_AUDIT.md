# CINSTE Web Role UX Audit — V1

**Scope:** Product/UX and screen-architecture audit of the existing responsive-web role surfaces. This is not a redesign specification or implementation plan for data authority. It preserves the current Core and Impact rules, RLS, RPCs, payment model, and native-mobile-only student boundary.

**Evidence base:** `docs/PROJECT.md`, `docs/CURRENT_STATE.md`, the provisional V1 brand and design-system documents, the named web routes/actions, and the directly supporting Core/Impact schema and RPC contracts. The landing page and native student app are out of scope.

## Audit conclusion

The web surfaces are not merely visually dated. The Core and Impact backends already cover most V1 operations, but the web product is unevenly exposed: Partner can technically redeem but is not optimized for a live counter; Organization and Impact Admin have a usable operational foundation; Giver ends immediately after checkout and cannot understand its continuing outcome; and login cannot reliably route an organization operator into the correct web workspace.

The largest V1 gap is the **Giver outcome experience**: the backend safely records orders, funded campaigns, inventory, claims and redemptions, but a giver is not permitted to read the claim/redemption data needed to answer the outcome questions. The largest P0 interaction gap is the **Partner redemption flow**: the authority exists, but the current page makes the primary counter task slower and less decisive than it needs to be.

## Auth / Login

### Current state

`/login` combines sign-in and sign-up in two compact forms. It displays query-string errors, has no password-recovery path, no explicit loading/disabled state, no account/verification explanation, and retains the older visual language. Successful login routes only from `profiles.role`: Admin to `/admin`, Partner to `/partner`, Giver to `/giver`, otherwise `/student`.

### Existing backend capabilities

Supabase Auth supports email/password sign-in and sign-up. The `profiles.role` model supports student, giver, partner and admin. Organization access is intentionally additive: an authenticated account is authorized by an active `organization_users` assignment and active organization, so one account may also be a student. No new role system is needed.

### UX gaps

- An assigned organization operator can authenticate successfully but is not routed to `/organization`; the current destination helper cannot inspect organization assignment.
- A web-only operational user has no clear post-login confirmation of where to go, especially where an account has more than one legitimate surface.
- Password recovery is absent from the product flow.
- Form errors are raw and transient, and loading, success, verification, and account-creation states are not communicated as product states.
- The screen does not yet use the accepted landing-page brand direction or the design-system form/state patterns.

### V1 screen architecture

| Screen / view | Purpose | Primary user action | Critical information | Status | Implementation type | Priority |
|---|---|---|---|---|---|---|
| Sign in | Return an existing user to the right permitted surface | Sign in | Email, password, clear error/loading state, role/workspace destination | exists | presentation-only | P0 |
| Create account | Create a basic account without implying an unsupported role | Sign up | Name, email, password, what happens next, verification expectation where relevant | partial | presentation-only | P1 |
| Password recovery | Restore access without support intervention | Request reset and set a new password | Email acknowledgement, reset validity, safe error/loading states | missing | frontend behavior | P1 |
| Access destination / workspace chooser | Resolve an account with organization access or multiple valid contexts | Continue to a workspace | Available workspaces and why they are available; no role mutation | missing | frontend behavior | P0 |

`/student` must remain an app handoff or explanatory state, not a new student web product.

### V1 implementation priority

P0 is sign-in consistency plus assignment-aware destination selection. P1 is recovery and sign-up-state quality. No auth backend, role, RLS, or account-model change is required for this scope.

## Giver

### Current state

`/giver` is an offer catalogue with quantity selection and mock checkout. `/checkout/[orderId]` simulates payment. `/giver/success/[orderId]` thanks the giver, states how many students could receive an experience, shows the order total and currently available inventory, and offers a return to the catalogue. There is no giver home/history after that moment.

### Existing backend capabilities

The trusted checkout path derives price, items and campaign inventory server-side. A giver can read their own orders, items and payments. The payment confirmation creates campaigns linked to the giver order, retaining `quantity_total` and `quantity_available`. Claims and redemptions are separately recorded and server-authoritative. Active offers, partners and campaigns are readable for funding discovery.

### UX gaps

- Funding is framed as selecting an offer rather than a clear, human campaign/outcome decision.
- There is no contribution history, order status, retry/failed-payment return path, or durable “what I funded” record.
- The success screen provides only a momentary inventory number, not a persistent, understandable outcome.
- The product cannot currently show a giver how many of *their* funded experiences were claimed or redeemed: claim and redemption reads are restricted to students, assigned partners, and Admin. This is a real self-scoped read-model gap, not a charting problem.
- The mock-only payment status must remain plainly labelled until a real provider exists; it should not be made to look like production checkout.

### V1 screen architecture

| Screen / view | Purpose | Primary user action | Critical information | Status | Implementation type | Priority |
|---|---|---|---|---|---|---|
| Fund an experience | Select an active experience and quantity | Start checkout | Partner, experience, price, quantity, availability, mock-payment disclosure | exists | presentation-only | P1 |
| Checkout | Confirm a funding attempt | Complete or abandon the mock payment | Items, total, mock status, clear success/failure result | exists | presentation-only | P1 |
| Funding confirmation | Turn a completed payment into an outcome moment | View contribution or fund again | Funded quantity, experience, current availability, next destination | partial | presentation-only | P1 |
| My contributions | Give a giver a durable, outcome-focused history | Open a contribution | Experience, partner, paid/failed state, quantity funded, remaining; claimed/redeemed counts when available | missing | backend gap | P0 |
| Contribution detail | Explain one funded campaign without becoming a finance dashboard | Fund again or return to contributions | What was funded, inventory remaining, claimed, redeemed, simple outcome language | missing | backend gap | P1 |

### V1 implementation priority

P0 is a self-scoped giver contribution/outcome projection that returns only the giver's own orders/campaign aggregates (funded, available, claimed, redeemed) and a simple history UI. It must not expose student identity, credentials, or partner operational data. Once that projection exists, the screens are frontend work. P1 is polish of discovery, checkout and confirmation. Real payments remain deferred production-readiness work.

## Partner

### Current state

`/partner` authenticates, checks `partner_users` membership, offers camera scanning and manual token entry, calls `inspect_redemption`, and exposes a `REDEEM` action only for `VALID`. It renders a recent-redemptions list. The scanner has a deliberate manual-code fallback and development-only diagnostics.

### Existing backend capabilities

`inspect_redemption` returns the authoritative validation state and offer/partner context; `redeem_claim` rechecks authorization and validity server-side before atomically redeeming and writing a redemption event. It covers invalid code, already redeemed, expired, wrong partner, and (where applicable) not-yet-valid outcomes. `partner_users` supports assigned staff access, including more than one assignment, and Admin can assign/revoke access with an audit trail. Partner members can read their assigned claim/redemption context; active offers/campaigns expose live offer and availability data.

### UX gaps

- The page is functionally present but not structured around the counter sequence: **scan or enter → understand the result → confirm → see success → immediately scan next**.
- Raw uppercase server states and a generic `REDEEM` label do not make the safe action or the reason for refusal clear to staff.
- Success currently redirects with a text result rather than preserving the just-redeemed offer, timestamp, and a prominent next-scan action.
- The history is useful but lacks an explicit partner context, concise filters, and a clear empty/retry treatment.
- There is no lightweight view of the assigned partner's currently redeemable offers/campaigns and remaining availability, even though relevant active records are readable.
- Staff access already exists technically; the missing product work is a clear Admin assignment workflow handoff and, for multi-assigned users, a partner-context selector. No POS integration is justified.

### V1 screen architecture

| Screen / view | Purpose | Primary user action | Critical information | Status | Implementation type | Priority |
|---|---|---|---|---|---|---|
| Redeem CINSTE | Complete a counter redemption in seconds | Scan QR or enter short code | Camera permission/fallback, manual code, selected partner context | partial | presentation-only | P0 |
| Validation result | Let staff decide safely before redemption | Confirm redemption when valid | Offer, partner, validity state, explicit invalid/expired/already-redeemed/wrong-partner explanation; no secret/token exposure | partial | presentation-only | P0 |
| Redemption confirmation | Close the transaction and reset for the next customer | Scan next CINSTE | Redeemed offer, time, success confirmation, next-scan action | partial | frontend behavior | P0 |
| Recent redemptions | Give staff minimal operational reassurance | Review recent activity | Offer, campaign, time, status; selected partner and empty/error states | exists | presentation-only | P1 |
| Active offer availability | Help staff understand what can currently be redeemed | View current offer/campaign | Offer, campaign, remaining availability, validity window | missing | frontend behavior | P1 |
| Partner context selector | Avoid ambiguity for a staff account assigned to multiple businesses | Switch current partner | Partner name and selected context; redemption remains server-authoritative | missing | frontend behavior | P1 |

### V1 implementation priority

P0 is the operational core only: fast scan/manual entry, explicit validation result, confirm, success/reset. P1 adds recent-history quality, current offer visibility and multi-partner selection. The existing assignment model is sufficient for V1 staff access; a staff-management dashboard, POS integration, or complex analytics is intentionally deferred.

## Organization Operator

### Current state

`/organization` is already a scoped Impact workspace. It selects from organizations authorized by RLS, supports multi-organization switching, creates/edits/publishes/cancels opportunity drafts, groups participants into action/review/history, and supports completion verification and excusal. It deliberately uses minimal participant identifiers and reasoned destructive actions.

### Existing backend capabilities

Active organization plus active assignment is the access authority. Existing RPCs enforce draft-only editing, publishing/cancellation, capacity and lifecycle rules, completion verification, and eligible outcome resolution. The operator can read only its organizations, opportunities, necessary participations and its contribution context. Admin retains disputes, corrections and exceptions.

### UX gaps

- The operational foundation is substantially V1-ready; its gap is not missing CRUD.
- “Needs action” contains joined participants but does not foreground time/order or distinguish ordinary completion work from overdue operational risk.
- Draft creation is always visually first, rather than an at-a-glance queue of published/upcoming opportunities and reviews.
- The workspace does not explicitly show filled/remaining capacity, although it has capacity and participations to calculate it in the UI.
- Organization history is present as a participant group but not a concise opportunity-level operational history.

### V1 screen architecture

| Screen / view | Purpose | Primary user action | Critical information | Status | Implementation type | Priority |
|---|---|---|---|---|---|---|
| Organization workspace / selector | Work in one permitted organization | Select organization | Organization status, active assignment, switcher where applicable | exists | presentation-only | P1 |
| Opportunity list | See current work before creating more | Open or create an opportunity | Draft/published/cancelled state, timing, capacity/remaining slots, format | partial | frontend behavior | P1 |
| Opportunity editor | Create, edit, publish or cancel within lifecycle rules | Save draft or publish | Required timing, mode, capacity, immutable-after-publish explanation, cancellation consequence | exists | presentation-only | P1 |
| Participation action queue | Resolve the work that needs an operator decision | Verify completion or record allowed outcome | Opportunity, joined/completion context, status, overdue/disputed visibility, safe feedback | partial | presentation-only | P0 |
| Participation and opportunity history | Provide traceable context without excess student data | Inspect completed/cancelled history | Outcome, dates, verified status, capacity/outcome context | partial | frontend behavior | P2 |

### V1 implementation priority

P0 is a clearer participation action/review queue. P1 is opportunity-list hierarchy and remaining-capacity presentation. P2 is a fuller historical view. No Impact backend gap blocks these changes; the existing authority model should remain untouched.

## Admin

### Current state

Admin is spread across `/admin` (headline counts and pending student verification), `/admin/manage` (catalogue, partners, offers, campaigns and partner assignments), `/admin/operations` (read-only claims, orders, payments, redemptions and access events), and `/admin/impact` (Impact overview, organizations, participation review, contributions and reciprocity). Core and Impact mutation actions already require the appropriate server/RPC authority and reasoned correction flows where required.

### Existing backend capabilities

Admin can manage the Core catalogue and campaign lifecycle, approve/reject verification, manage partner assignments, inspect Core operations, create/activate/deactivate organizations, assign/revoke operators, review/verify Impact participations, revoke contributions, and waive a current reciprocity requirement. The schema already records campaigns/inventory, claims, redemptions, funding/payment states, access events, Impact audit records, participation review requests and reciprocity state.

### UX gaps

- The routes are capability-complete in places but navigation is fragmented; Admin must know which of four pages holds the next action.
- The home dashboard reports counts but not a prioritized operational queue: pending verification, failed/pending payment, low/empty active campaign inventory, active claims near expiry, unresolved Impact overdue/dispute requests, and assignment/access exceptions.
- Core operations are audit-table views rather than a practical exception triage surface. This is an information architecture issue, not a need for a large generic dashboard.
- Campaign inventory, claims and redemptions are visible but not connected in a single operational campaign view.
- Current state correctly lists a production stale-claim scheduler and monitoring as later readiness work. A UI should not simulate live alerts before those sources exist.

### V1 screen architecture

| Screen / view | Purpose | Primary user action | Critical information | Status | Implementation type | Priority |
|---|---|---|---|---|---|---|
| Admin operational home | Direct staff to the next actionable exception | Open a queue or management section | Pending verifications, funding/payment exceptions, inventory attention, Impact review/dispute/overdue counts | partial | frontend behavior | P0 |
| Student verification queue | Decide verification safely | Approve or reject | Student/university, submitted time, private document only through existing protected route, reason on rejection | exists | presentation-only | P0 |
| Core catalogue and partner management | Maintain partners, offers, campaigns and staff assignments | Create/edit/manage status | Lifecycle limits, campaign availability, assignment state, immutable transaction context | exists | presentation-only | P1 |
| Core operations and exceptions | Investigate claims, funding, payments, redemption and assignment anomalies | Filter/open the relevant record | Status, time, related campaign/partner/order, safe empty/error states | partial | frontend behavior | P1 |
| Impact operations | Operate organizations, reviews, contributions and reciprocity exceptions | Take the allowed reviewed action | Context, reason, audit consequence, existing state labels | exists | presentation-only | P0 |
| Campaign inventory detail | See the operational state of one campaign without changing historical funding | Open campaign context | Funded, available, claim/redeem counts, schedule, offer, partner, lifecycle state | missing | frontend behavior | P1 |
| Automated anomaly monitoring | Reliably surface scheduler/production-health events | Investigate a real alert | Source, time, severity, owning operation | missing | backend gap | P2 |

### V1 implementation priority

P0 is one navigable operational home that links existing Core verification and Impact queues, not a new enterprise analytics product. P1 connects existing operations into campaign and exception context. P2 depends on production scheduler/monitoring work already explicitly deferred; it is not a blocker for web UI completion.

## Cross-role navigation model

- **Entry:** Public landing calls to action should enter the intended surface: funding to `/giver`, partner staff to `/partner`, and organization operators to `/organization`. Admin is internal-only. Student actions continue to native mobile; web should not expose a student dashboard.
- **Authentication:** An unauthenticated protected route redirects to `/login` and, after success, returns to the originally requested authorized route when safe. If there is no requested route, routing resolves role plus active organization assignment. Accounts with more than one eligible workspace see a small workspace chooser; choosing a workspace does not modify profile role or assignment.
- **Role navigation:** Giver uses a small consumer navigation: Fund an experience / My contributions. Partner is task-first: Redeem / Recent / Offers, with partner context visible. Organization uses Workspace / Opportunities / Participants (these may initially be views on the existing route). Admin uses Overview / Verification / Core management / Core operations / Impact. Navigation must not expose a surface solely because a link exists; server/RLS remains the authority.
- **Return paths:** After funding, return to contribution detail or My contributions. After redemption, reset to Redeem with the completed result briefly visible and a next-scan action. After organization or Admin mutation, remain in the affected queue with visible success feedback and refreshed authoritative data. No primary action should strand a user on a generic home page.

## Recommended implementation order

1. **Auth consistency and destination selection (P0):** bring login states into the accepted system and add assignment-aware, request-preserving routing/workspace choice. Do not change Auth or role authority.
2. **Partner operational core (P0):** make validation, confirmation and reset a counter-speed flow using the existing inspect/redeem boundaries; add no POS integration.
3. **Giver outcome foundation (P0):** first add the narrow self-scoped backend aggregate required for claimed/redeemed outcomes, then ship My contributions and its detail view. Keep it aggregate and human, never a financial dashboard.
4. **Organization action queue (P0/P1):** improve hierarchy around participation decisions and capacity using existing organization RPCs/RLS.
5. **Admin operational home (P0/P1):** unify links and actionable queues across existing Core and Impact workspaces, then add campaign exception context.
6. **Cross-role consistency pass (P1):** shared form/state/navigation patterns, accessible loading/error/success states, narrow/tablet/desktop checks, localization and RTL checks. Preserve expressive warmth for Giver and restrained density for operational surfaces.

## Backend gaps and deliberate deferrals

The only UI-completion blocker identified is the **giver self-outcome aggregate**. It should be a minimal authenticated projection keyed to `auth.uid()` and return only the giver's own order/campaign totals and aggregate claimed/redeemed counts. It must not relax claim/redemption RLS or reveal student identity, redemption credentials, or unrelated campaign data.

Password recovery can use existing Supabase Auth and is frontend integration work, not a new product-authority model. Organization-aware login routing and partner context are likewise frontend behavior backed by existing assignments. Production payment integration, stale-claim scheduling, monitoring/automated alerts, POS integration, advanced partner analytics, self-service organization onboarding, and a student web surface are intentionally deferred.
