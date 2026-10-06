---
tur: arsiv
---
# CINSTE Impact V1 Architecture Audit

## 1. Executive recommendation

Implement Impact as an additive, database-authoritative capability beside Core MVP:

- Add organization records and scoped operator assignments, using the existing `partner_users` pattern as the model.
- Add a small opportunity/participation/contribution model plus an append-only Impact audit log.
- Add a campaign reciprocity classification (`COMMUNITY`/`OPEN`) and a per-student current-cycle state. Do not infer reciprocity from mutable UI state or historical analytics.
- Extend `claim_campaign` so it locks and evaluates verification, campaign type, current reciprocity, supply-waiver policy, and the existing rolling 24-hour rule in one transaction.
- Create verified contributions only through a server-side completion RPC that proves organization ownership, locks the participation and student reciprocity state, and records a one-time settlement.
- Keep student data self-scoped, organization data organization-scoped, and all material admin overrides reasoned and audited.

The smallest safe V1 is not admin-only: organizations need operational ownership of their own opportunities and participations. It also should not add a second mutable role system. Use active organization assignments as the authorization source; the current single `profiles.role` enum is a coarse account surface gate and cannot safely represent a user who is both a student and organization operator.

## 2. Existing patterns to reuse

- Identity and student authorization: `public.profiles`, `public.student_profiles`, and `public.student_verifications` in `supabase/migrations/0001_cinste.sql`; the mobile gate is `apps/mobile/src/lib/mobile-routing.ts` and `apps/mobile/src/app/(student)/_layout.tsx`.
- Verification lifecycle: `submit_student_verification` and `review_student_verification` in `supabase/migrations/0006_verification_lifecycle_deactivation.sql`, hardened against Storage metadata in `0010_final_core_hardening.sql`. Reuse the RPC-only state transition, row locks, reviewer identity, and private document boundary. Organizations must never receive these documents.
- Assignment authorization: `partner_users`, `is_partner_for(uuid)`, `admin_assign_partner_user`, and `admin_revoke_partner_user` in `0001`, `0009_admin_operations.sql`; access history is `partner_user_access_events` plus its trigger in `0010`. Impact should use an `organization_users` table and the same assignment/revocation/audit shape.
- Admin authorization: `is_admin()` in `0001`; admin RPCs in `0009`; web checks in `app/admin/actions.ts` and `app/admin/operations/page.tsx`. Keep database RPC checks authoritative even when web actions pre-check the role.
- RLS organization pattern: `partner_users` select policy, `is_partner_for`, and partner-scoped `claims`/`redemption_events` policies in `0001`. Impact policies should scope through `organization_users`, never through client-supplied organization IDs alone.
- Audit/history: `redemption_events`, `analytics_events`, and `partner_user_access_events` in `0001`/`0010`. Impact lifecycle history needs an operational audit table; do not use analytics as the source of truth.
- Claim enforcement: `claim_campaign` in `0005_payment_claim_validity.sql` locks the student and campaign, checks verified status, applies the rolling 24-hour rule, atomically decrements inventory, and creates the secret. `redeem_claim` locks the claim and writes `redemption_events`; successful redemptions are therefore the correct Core event for reciprocity counting.
- Campaign operational predicate: `campaign_is_claimable` and the revised discovery policy in `0006`/`0008`. Impact must extend the authoritative claim predicate rather than rely on mobile discovery filtering.
- Mobile freshness: `apps/mobile/src/context/auth.tsx` listens to `AppState` and refreshes on foreground; `apps/mobile/src/lib/freshness.ts` defines the behavior. Impact state must be refreshed with the same foreground lifecycle, but freshness must include server-derived reciprocity/opportunity state.
- Web operational style: `app/partner/page.tsx` checks session and assignment before partner operations; `app/admin/actions.ts` uses Zod, server actions, RPCs, and `revalidatePath`. Organization pages should follow this pattern with organization-scoped RPCs/actions.

## 3. Recommended organization access model

### Options

- A. New hard profile role: simple route gating, but unsafe for a person who is both a verified student and organization operator; it also duplicates assignment scope and cannot express multiple organizations cleanly.
- B. `organization_users` assignment model: matches `partner_users`, supports one operator assigned to one or more organizations, and keeps scope explicit. It requires web routes/actions to authorize by assignment rather than only by `profiles.role`.
- C. Admin-only operations: smallest schema, but contradicts organization-created opportunities and creates an unnecessary operational bottleneck.

### Recommendation

Use B. Add `organizations` and `organization_users` with an explicit assignment status or revocation represented by history, and audit assignment changes. An active assignment is the source of organization access. Do not add a second flexible role matrix in V1. If a web shell needs a route label, it may derive “Organization Operator” from an active assignment; it must not make `profiles.role` the authority.

This deliberately preserves the existing `profiles.role` model for Core routing while allowing a student/operator account. Any future hard role enum change is an owner decision, not required for the safe Impact capability boundary.

## 4. Minimal data model

### `organizations`

Purpose: verified organization identity and lifecycle (`pending`, `active`, `suspended`). Key fields: name, description/contact fields needed for operations, review status, reviewed_by/reviewed_at, created/updated timestamps. Historical contributions reference the organization and survive deactivation. Do not store student documents here.

### `organization_users`

Purpose: assignment of an authenticated operator to an organization. Key relationship: `(organization_id, user_id)` to `organizations`/`profiles`; include assigned/revoked timestamps and actor if revocation is represented on-row. Authoritative access is an active assignment plus active organization. Add append-only `organization_user_access_events` for assignment/revocation history.

### `impact_opportunities`

Purpose: organization-created work offer. Key fields: organization_id, title/description, category, mode (`scheduled` or `flexible_remote`), start/end for scheduled mode, expected eligible minutes, capacity, status (`draft`, `published`, `cancelled`, `closed`), publication and cancellation timestamps. Store the expected duration once; completion cannot freely inflate it. Derive remaining capacity from participations in a transaction or maintain it only with a locked, invariant-preserving counter. No recurrence or waitlist fields.

### `impact_participations`

Purpose: one student’s seat/engagement in one opportunity. Key fields: opportunity_id, student_id, status (`joined`, `cancelled`, `late_cancelled`, `completed`, `no_show`, `excused`, `disputed`, `overdue`), joined/cancelled/resolved timestamps, resolution actor/reason, dispute fields, and a uniqueness rule preventing more than one active participation per student/opportunity. Scheduled overlap and the per-student active limit are enforced by the join RPC.

### `impact_contributions`

Purpose: authoritative verified Impact measurement. Key relationship: exactly one participation and its organization/student; fields include verified minutes, verified_at, verifier_id, and revocation/override fields. One participation can produce at most one current verified contribution. Stats derive from non-revoked contributions; do not store points, money, or contribution credits.

### Reciprocity state

Use one current row per student, e.g. `impact_reciprocity_state`: community redemption count in the current cycle, state (`OPEN`/`GIVE_BACK_DUE`), due/waiver metadata, and current-cycle timestamps. `APPROACHING_DUE` is computed from the count. Existing students get a fresh row lazily or in a controlled backfill; historical redemptions are not imported. Store a settlement reference/current-cycle contribution ID or a cycle number so one contribution cannot settle twice. Do not store contribution banking.

### `impact_audit_events`

Append-only records for admin overrides, organization review/deactivation, participation dispute decisions, contribution verification/revocation, waivers, and material organization/operator actions. Include actor, target type/id, action, reason, timestamp, and a small JSON snapshot of changed values. Do not use a generic client-writable analytics event for this.

Derived rather than stored: Impact Profile totals, unique organizations helped, available capacity where safely countable, `APPROACHING_DUE`, active participation count, no-show counts in the rolling 90-day window, and whether an existing claim was valid. A read RPC/view may project these values without granting broad base-table access.

## 5. Reciprocity architecture

`campaigns` currently has no reciprocity classification. Add an authoritative enum/column with default `COMMUNITY`; only authorized admin campaign operations may set `OPEN`. Do not use sponsor text or client metadata.

`redeem_claim` is the event boundary. On the successful redemption transaction, lock the student reciprocity row and the claim/campaign as already done for redemption. If the campaign is `COMMUNITY`, increment the current cycle only once for that redeemed claim; after the third successful community redemption set `GIVE_BACK_DUE`. Expired, cancelled, unused, and merely claimed records never increment it. Existing active claims remain valid if the student becomes due later.

`claim_campaign` then performs, in one server-side transaction:

1. verified-student check;
2. campaign claimability and `COMMUNITY`/`OPEN` classification;
3. current reciprocity state check;
4. reasonable-supply waiver check if due;
5. existing rolling 24-hour rule;
6. campaign row lock and atomic inventory decrement;
7. claim and secret creation.

`OPEN` bypasses reciprocity only; it still requires verification, campaign eligibility, inventory, and the 24-hour rule. A due student may claim `COMMUNITY` only when an explicit supply waiver is active. For V1, reasonable supply means at least one active, published opportunity with capacity reasonably available within the next 14 days, considering remote or Bucharest opportunities. Active participation limits, cooldowns, and personal schedule overlap are user-caused restrictions and do not establish platform supply failure. The waiver must leave the student due and must not create multiple debts.

Contribution verification while due locks the student state and participation, verifies the participation is eligible and belongs to the same organization, and atomically settles exactly the current cycle. A contribution before due remains profile history only. A contribution after a waiver still settles one due cycle; it does not accumulate credits. Revocation must mark the contribution invalid and audit the action, but must not replay or rebuild old cycles.

## 6. Opportunity / participation state model

Keep the operational state machine small:

`draft -> published -> closed` or `published -> cancelled`; a published opportunity can have participations. A scheduled participation starts `joined` and resolves to one of `cancelled`, `late_cancelled`, `completed`, `no_show`, `excused`, `cancelled_by_organization`, or `disputed`; a flexible/remote participation may resolve to `cancelled`, `completed`, `cancelled_by_organization`, `disputed`, or `expired_incomplete` after `due_at`. An unresolved scheduled participation can become `overdue` after the 72-hour resolution window. A disputed result is resolved by admin to a terminal outcome rather than silently overwritten.

- Join RPC locks the opportunity, verifies active organization/publication/verification, enforces capacity, max two active participations, and scheduled overlap.
- Normal scheduled cancellation is allowed at least four hours before start; later cancellation becomes `late_cancelled`.
- Flexible/remote opportunities may be cancelled normally before `due_at`; they have no late-cancel/no-show semantics, and become `expired_incomplete` if incomplete after `due_at`.
- Organization cancellation resolves participation as `cancelled_by_organization`, creates no contribution, and creates no student penalty; `excused` remains a separate student-specific outcome.
- Organization completion/no-show/excused actions are scoped to their own opportunity and normally allowed until 72 hours after the relevant end. After that, mark overdue and expose admin review; never auto-verify.
- First/second/third no-show behavior is derived from non-disputed, non-excused no-shows in the previous 90 days and written as a server-side join cooldown check. Open CINSTE remains claimable. Admin can resolve a dispute or excuse a no-show with an audit event.

## 7. Contribution verification model

Only a trusted `verify_impact_participation` RPC should create the authoritative contribution. It must:

- require an authenticated active operator assignment for the participation’s organization, or admin;
- lock the participation and reject already-resolved/duplicate verification;
- require the student to be verified at the time of the operation and reject verifier/student identity overlap, including an account with both student and organization access;
- accept only the opportunity’s fixed expected eligible duration (no arbitrary inflation and no partial credit in V1);
- insert one contribution, resolve the participation to `completed`, and settle the current reciprocity cycle under the same transaction/lock;
- write actor, organization, timestamps, and an audit record.

Admin verify/revoke/override should use separate narrow RPCs with required reason and audit record. Revocation is a correction to current contribution validity, not a historical reciprocity replay. Organization completion must never be a direct client insert or a broad table update.

## 8. RLS / authorization model

RLS remains enabled on every Impact table. Security-definer RPCs must set `search_path`, explicitly check `auth.uid()`, lock rows, and grant execution only to `authenticated` as appropriate.

- Student: select published eligible opportunities; insert/join only through a self-scoped join RPC; read only own participations, contributions, reciprocity projection, and profile totals; cancel only own participation through a policy/RPC. No update of status, verification, contribution, reciprocity, or organization fields.
- Organization operator: read/update only opportunities whose `organization_id` has an active `organization_users` assignment; read only operational participant data for those opportunities; resolve/verify only those participations. Never select verification documents, full claims/transactions, unrelated contributions, or unnecessary contact fields.
- Admin: full operational control via admin-scoped policies/RPCs, including organization review, opportunity moderation, disputes, contribution corrections, reciprocity waivers, and audit history.
- Organization public discovery must expose only published, active, non-sensitive opportunity fields. Direct base-table selects should not expose private operator or participant data.
- A student/operator overlap check is a server-side identity condition on verification, not a UI rule. Existing `student_profiles`/`student_verifications` policies remain unchanged for Impact operators.

## 9. Mobile integration

Minimal future changes:

- add an `Impact` tab under the existing verified-student `(tabs)` layout;
- gate the tab and nested routes with the existing `resolveMobileDestination`/verified-student boundary, while leaving RLS/RPCs authoritative;
- add list/detail queries for published opportunities, participation history/status, and a server-derived Impact Profile/reciprocity projection;
- add a post-redemption optional CTA; it must not mutate reciprocity;
- show `GIVE_BACK_DUE` and route to eligible Impact opportunities; `OPEN` campaigns remain claimable without forcing the CTA;
- add join/cancel/dispute actions that call RPCs, never direct status writes;
- extend `AuthProvider` foreground refresh to refresh Impact summary/reciprocity and invalidate opportunity/participation queries. Do not trust a cached due state for claiming.

The current app has no Impact tab and `AuthProvider` refreshes student identity only. This is a minimal extension of existing freshness, not a new background scheduler.

## 10. Web/admin integration

Organization web surface: authenticated access derived from active `organization_users`; organization selector only among assigned organizations; opportunity create/edit/publish/cancel; operational participant list with minimal fields; complete/no-show/excused resolution; overdue/dispute visibility; contribution verification; organization history. Every action should use Zod server actions plus scoped RPCs and `revalidatePath`, following `app/partner/page.tsx` and `app/actions.ts` patterns.

Admin Impact surface: organization review/deactivation/reactivation; assignment management; opportunity hide/deactivate; participant/dispute queue; contribution verify/revoke; reciprocity waiver; operational audit history and supply-safeguard visibility. Do not redesign Giver, Partner, or existing admin areas beyond links/data needed to operate Impact.

## 11. Migration/backend plan

Additive dependency order:

1. Add Impact enums/tables, constraints, indexes, RLS, organization assignment audit, and safe read projections.
2. Add organization admin review/assignment RPCs and organization-scoped opportunity CRUD RPCs.
3. Add student join/cancel/dispute RPCs with capacity, active-count, overlap, verification, and no-show cooldown checks.
4. Add participation resolution and contribution verification RPCs, including identity-overlap rejection, cycle settlement, and audit records.
5. Add campaign reciprocity classification and extend `admin_create_campaign`/`admin_update_campaign`; existing campaigns default to `COMMUNITY`, with `OPEN` as an explicit Admin-controlled exception.
6. Replace/extend `claim_campaign` and `redeem_claim` transaction logic to enforce reciprocity and successful-redemption counting, preserving the existing 24-hour and inventory semantics.
7. Add projections/read RPCs and then mobile/web surfaces.
8. Add targeted integration coverage for concurrent claims, concurrent joins, duplicate verification, due/open/community combinations, waiver behavior, and RLS leakage.

Likely existing extensions: `app_role`/routing only if the owner insists on a hard operator role; `campaigns`, `admin_create_campaign`, `admin_update_campaign`, `claim_campaign`, `redeem_claim`, and the mobile types/queries/auth context. Prefer additive replacement of function definitions over rewriting Core tables or weakening existing policies. No SQL is prescribed by this audit.

## 12. Security and abuse risks

- Fake organization verification: require admin organization approval, active assignment, and audit events; never let an organization approve itself.
- Self-verification: reject when verifier `auth.uid()` equals the student, even if the account has both capabilities; enforce in the contribution RPC.
- Repeated fake contributions: one participation/one contribution constraints, fixed duration, operator scope, admin review, and audit history.
- Slot race conditions: lock the opportunity row and count/allocate capacity in the join transaction; do not trust client availability.
- Duplicate settlement: lock student reciprocity and participation; use a unique current-cycle settlement reference/idempotency constraint.
- Client-side reciprocity bypass: enforce both claim and redemption effects in RPCs; mobile state is presentation only.
- Organization data leakage: organization-scoped RLS/projections and minimal participant fields; no broad joins to claims, verification, or unrelated history.
- Stale mobile due state: foreground refresh and server re-evaluation in `claim_campaign`; a stale UI may be wrong but cannot authorize a claim.
- Admin override abuse: narrow RPCs, required reason, actor/timestamp/target audit event, and no silent historical cycle rebuild.
- Supply safeguard abuse: compute availability server-side from published eligible slots, keep the student conceptually due, use a bounded cache/window if needed, and audit waiver decisions; do not allow client-supplied waiver flags.

## 13. Recommended implementation batches

1. **Backend foundation and organization scope** — Impact tables, organization assignments, enums/constraints, RLS, admin assignment/review RPCs, and audit records. Depends only on Core schema. Validate with migration review and focused RLS/assignment tests. Astra/high-risk review: warranted because this establishes organization isolation and multi-capability access.
2. **Opportunities and participation lifecycle** — opportunity CRUD, publish/cancel, join/cancel/dispute, capacity/overlap/max-two/no-show checks, and organization operational reads. Depends on batch 1. Validate concurrent join and organization-leakage tests. Astra: warranted if overlap/capacity SQL becomes non-trivial; otherwise focused review is sufficient.
3. **Verified contributions and reciprocity state** — resolution, contribution verification, admin correction, cycle settlement, no banking, and audit. Depends on batches 1–2. Validate duplicate/concurrent verification, self-verification, revocation, waiver, and cycle tests. Astra: warranted; this is the highest-risk trust boundary.
4. **Core claim integration** — campaign classification, admin campaign RPC extensions, `claim_campaign`/`redeem_claim` changes, supply safeguard, and regression coverage for the 24-hour rule/inventory/existing active claims. Depends on batch 3. Validate Core integration and concurrency without a full application suite. Astra: warranted if the claim/redemption function changes are materially complex.
5. **Surfaces and freshness** — mobile Impact tab/routes/queries/profile/CTA and organization/admin web pages/actions. Depends on stable RPC contracts. Validate targeted mobile routing/freshness tests and web authorization checks; no Astra required unless UI exposes new sensitive data paths.

## 14. Open questions requiring owner decision

The previously identified owner questions are resolved in `impact-spec.md`:

- Reasonable supply: active, published, capacitated opportunity within 14 days; remote or Bucharest; user-caused restrictions do not count as platform failure.
- Existing campaigns default to `COMMUNITY`; `OPEN` is an explicit Admin-controlled exception.
- Organization onboarding is Admin/CINSTE-controlled; no public self-service onboarding.
- One auth account may be both verified student and assigned organization operator; surfaces remain separate and self-verification is prohibited.
- Flexible/remote opportunities cancel before `due_at`, have no late-cancel/no-show semantics, and become `expired_incomplete` after `due_at` if incomplete.
- Loss of student verification blocks new joins and Community claims but preserves existing participation/history and permits an existing joined participation to complete and be verified.
- Organization cancellation uses `cancelled_by_organization`; it creates no student penalty, while `excused` remains student-specific.

No additional owner decision is currently required for the architecture described here.

## 15. Explicitly out of scope for V1

Peer-to-peer requests, direct messaging, Skill Wallet, Impact Chain UI, social feed/followers/likes/comments, university circles, CSR sponsor dashboards, automatic PDF reports, public leaderboards, Impact points, monetary rewards, contribution banking, peer verification, advanced recommendations, waitlists, recurrence, and unrelated Core/Giver/Partner redesign.
