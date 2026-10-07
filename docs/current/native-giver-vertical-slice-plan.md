---
tur: mevcut
durum: taslak-inceleme-gerekli
kod-kapsami: []
---
# Native Giver Vertical Slice Architecture Plan

**Date:** 2026-10-07  
**Mode:** Owner-directed analysis only. No application, database, RPC, RLS, or
credential behavior changed.

## Purpose and constraints

This plan turns the locked mobile-first Giver direction into a smallest safe
native vertical slice: Giver signup/login, workspace entry, offer browse and
detail, funding, success, and My Giving/outcomes. It refines, rather than
replaces, the cross-platform audit.

One account has one stored `profiles.role`, plus zero or more independently
authorized Partner and Organization assignments. Native route selection is
presentation only. Database RLS, authenticated RPCs, and trusted server
execution remain the authority. The app bundle must never contain a
service-role key, a Giver provisioning grant, or a direct call path to the
service-only funding RPCs.

## Native auth and workspace model

On every session restoration, sign-in, foreground refresh, and authenticated
app-link return, the app resolves a workspace envelope from the current
session:

1. Read the caller's own `profiles.role`.
2. Read only the caller's own Partner assignment context and active
   Organization assignment context through existing RLS-protected reads.
3. Derive permitted workspaces locally: a Student or Giver profile contributes
   its corresponding consumer workspace; a Partner workspace requires the
   caller's valid Partner assignment; an Organization workspace requires an
   active Organization assignment. Admin contributes no native workspace under
   the current strategy. A missing or stale read never grants a workspace.
4. Open the sole workspace directly; when two or more are available, open a
   workspace chooser. Persisting a last choice in SecureStore is a convenience
   only and must be revalidated before navigation and protected requests.

Student verification gates only Student routes. It must not hide an otherwise
authorized Giver, Partner, or Organization workspace. A Student with an active
Organization assignment can choose either; an account with a Giver profile and
an additive assignment follows the same rule. Admin has no approved native
workspace, so the resolver may present a safe web-only boundary while still
allowing any separately authorized additive workspace.

The existing `role-boundary` remains a safe fallback while this is built. It is
not the eventual multi-workspace router. Native deep links must be an exact
allowlist of app routes and parameters; a link can request a destination but
cannot select a workspace or prove authorization.

## Giver signup and sign-in

The existing native `auth.signUp` is Student-only and must remain that way.
The Giver flow needs a separate role-intent entry and must not set a role from
client metadata.

Use a trusted server endpoint/BFF for new Giver signup. It accepts only
validated normalized email, password, and display name; it then performs the
same sequence as the web Giver action inside trusted server execution:

1. Issue the ten-minute opaque provisioning grant using the service-only
   issuer.
2. Submit the normal Supabase Auth signup with that grant attached internally
   as the one-time transport proof.
3. Finalize the grant and require the consumed user ID to match the Auth
   result before reporting success.
4. Return only generic success/confirmation-needed state to the app. Do not
   return the grant, service credentials, raw Auth/internal errors, or a role
   mutation capability.

The Auth INSERT trigger remains the only writer of the initial literal
`giver` profile. Existing accounts sign in normally; a Giver signup attempt
must not upgrade an existing Student or other account. Preserve generic
duplicate/error treatment and add abuse/rate controls at the public endpoint.

Email confirmation requires a reviewed native callback: configure an exact
app-link redirect allowlist, exchange only the expected Auth code/session, and
then rerun the workspace resolver. The current app has no such callback, so it
is part of the slice rather than an assumed capability. Password recovery is a
separate release gap unless it is deliberately included in this auth change.

## Giver data and funding boundary

The native app may reuse these existing client-safe contracts:

| Need | Existing authority | Native use |
| --- | --- | --- |
| Browse and offer detail | Active `offers`, `partners`, and `categories` reads under existing RLS | Read-only catalog and detail presentation; client never supplies a price as authority |
| My Giving/outcomes | Authenticated `list_my_giving_outcomes()` | Direct authenticated read, unchanged projection and privacy states |
| Receipt/history display | Existing own-order RLS reads, if the exact required projection is sufficient | Read-only, self-scoped presentation only |

`create_mock_checkout` and `confirm_mock_payment` must remain executable only
by `service_role`. The mobile app must not call either RPC, write financial
tables, use a service key, or send a claimed Giver ID as authority.

For the current mock provider, add a reviewed authenticated funding BFF:

- The app sends its access token plus an offer ID/quantity (create) or order
  ID/success simulation (confirm).
- The BFF verifies the token, derives the caller ID itself, rechecks the
  literal Giver role, validates the bounded input, and invokes the
  service-only RPC with that derived ID.
- The database continues to recheck Giver eligibility, ownership, trusted
  price, offer/Partner state, order/payment state, and inventory inside the
  locked transaction. BFF checks are defense in depth, not a replacement.
- Responses are minimal and safe: order/checkout state and a display-safe
  receipt; they do not expose service errors, payment internals, or an
  arbitrary-user checkout path.

The mock success/failure controls must be visibly marked as the existing
non-production simulation. A real provider, payment intent, signed webhook,
reconciliation, refunds, and production payment operations are not part of
this slice and need their own owner decision and Astra review.

## Required native surfaces

- Role-intent auth entry, normal login, separate Student signup, and separate
  Giver signup/confirmation-pending states.
- Workspace resolver, chooser, role-local navigation shells, sign-out, and
  safe denied/unavailable states.
- Giver catalog, category/list loading/error/empty states, offer detail, and
  quantity selection.
- Mock checkout review, explicit confirmation/failure/retry treatment, and a
  success receipt with a fund-again return path.
- My Giving list/outcome cards that distinguish `available`,
  `privacy_suppressed`, and `unavailable`; suppressed or unavailable activity
  is never rendered as zero or inferred from other data.
- Foreground/session refresh and reviewed confirmation-return routing.

## What remains server-authoritative

- Profile creation role, provisioning-grant issuance/consumption/finalization,
  Auth transaction, and email-confirmation result.
- Workspace eligibility, Organization/Partner assignment status, and all
  protected route/data access.
- Offer price, quantity bounds, checkout/order ownership, payment state,
  campaign creation, inventory, and all financial-table mutations.
- Giver outcome attribution, five-person privacy threshold, activity metrics,
  and direct-table privacy/RLS policy.

## Smallest complete implementation sequence

1. **ASTRA REVIEW REQUIRED:** approve the public Giver-signup BFF, native
   confirmation app-link callback, authenticated mock-funding BFF, bearer
   verification, response schemas, rate/abuse controls, and credential
   placement. Confirm whether this contract is implemented in the existing
   Next.js deployment or a separately operated edge service; the security
   properties above are mandatory either way.
2. Add a tested native workspace-envelope resolver and chooser, retaining the
   current Student routes and verification gate unchanged. Add only the Giver
   shell at this stage; do not broaden Partner/Organization functionality.
3. Add separate native Giver signup/login and reviewed confirmation return,
   backed by the trusted signup endpoint. Test Student-default signup,
   Giver creation, existing-account non-upgrade, forged/expired/replayed grant
   denial, and app-link allowlisting.
4. Add read-only native Giver catalog and detail screens using existing RLS
   reads, then My Giving using `list_my_giving_outcomes()` unchanged. Test
   self scope and all three privacy/outcome states.
5. Add the reviewed mock funding BFF and native checkout, success, failure,
   retry, and fund-again loop. Test no client service credential/RPC access,
   non-Giver denial, cross-user order denial, price/offer changes, duplicate
   confirmation, and zero side effects on rejected calls.
6. Run focused TypeScript/unit tests, disposable database contract tests, and
   hosted DEV/QA assertions after confirming migrations `0021` and `0022` are
   applied. Perform authenticated mobile-device acceptance for signup,
   confirmation return, workspace switching, funding, receipt, and outcomes.
   Keep web Giver live until native parity evidence exists and the owner makes
   the already-recorded companion-versus-handoff decision.

## Required decision/checkpoint

No new product-semantic owner decision is required for the mock vertical slice:
the role, provisioning, funding eligibility, and privacy behavior are already
locked. However, implementation cannot begin on the provisioning/funding or
confirmation-link boundary without the required Astra security review. The
only implementation-shaping choice to record during that review is the
operational host for the trusted BFF (existing Next.js deployment versus a
separately operated edge service); it must preserve the specified contract and
does not change product behavior.
