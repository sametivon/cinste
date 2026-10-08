---
tur: mevcut
durum: taslak-inceleme-gerekli
kod-kapsami: []
---
# Native Giver Vertical Slice Architecture Plan

**Date:** 2026-10-07  
**Mode:** Astra-reviewed implementation contract. No application, database,
RPC, RLS, or credential behavior has changed yet.

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

Use dedicated Node-runtime route handlers in the existing Next.js deployment
as the trusted BFF host. Do not use Server Actions for the Expo contract. The
service-role key exists only in server-side, isolated non-production secrets;
it must never appear in `EXPO_PUBLIC_*`, Expo config/extra, mobile build
inputs, source maps, client bundles, logs, or fixtures. A separately operated
edge service is not approved for this slice without a new equivalent-controls
review.

`POST /api/native/giver/signup` accepts exactly
`{ email, password, displayName? }`, with strict server validation and no role,
user ID, redirect URL, workspace, grant, or arbitrary metadata field. It
normalizes the email server-side, applies password/display-name bounds, and
returns only `202 { status: "confirmation_needed" }` for both new and
duplicate accounts. Invalid shapes, throttling, and temporary failures may
return only generic `400`, `429`, and `503` outcomes. It then performs the
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

Email confirmation requires one exact callback path. Use a verified HTTPS
Universal/App Link for release; accept only an expected authorization code on
that path, complete the PKCE/session exchange, discard link intent, and rerun
the workspace resolver. Do not accept raw access/refresh-token fragments, an
arbitrary `redirectTo`, workspace, return path, or route parameter. The current
app has no such callback, so it is part of the slice rather than an assumed
capability. Password recovery is a separate release gap unless it is
deliberately included in this auth change.

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

For the current mock provider, add these reviewed authenticated funding BFF
routes:

```
POST /api/native/giver/funding/checkout
body: { offerId, quantity }
201: { status: "pending", order: { id, status, totalBani } }

POST /api/native/giver/funding/confirm
body: { orderId, success }
200: { status: "paid" | "failed" | "already_paid" | "already_failed" }
```

Each route requires exactly one bearer token and verifies it server-side with
Supabase Auth `getUser(accessToken)` (or an equivalently maintained JWKS
verifier). Decoding JWT claims or accepting a client-supplied Giver ID is not
verification. The route rereads the stored profile role, requires literal
`giver`, validates UUIDs, quantity `1..100`, and the boolean before invoking a
service RPC. A cross-user order is a generic unavailable/not-found result.
Confirmation is idempotent and returns the current safe state without creating
additional campaigns, inventory, or analytics events.

The reviewed BFF rules are:

- The app sends its bearer token plus an offer ID/quantity (create) or order
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

Rate-limit signup by IP plus a privacy-preserving keyed email fingerprint, and
funding by verified user plus IP, with short-burst and sustained quotas. On a
validation, rate-limit, or bearer failure, do not issue a grant or invoke a
service RPC. CORS is not native authentication: do not emit permissive CORS;
any later browser origin allowlist must be exact. Structured logs may contain
a request ID, endpoint, result class, and redacted/hash identifiers only; they
must never contain bearer tokens, passwords, grants, confirmation URLs/codes,
service errors, or raw email.

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

1. **Astra review completed with binding changes:** use the existing Next.js
   Node-runtime BFF, server-side secret isolation, exact route schemas,
   server-side bearer verification, profile recheck, no permissive CORS,
   rate/abuse controls, redacted logs, and exact PKCE confirmation callback.
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

## Required acceptance and deployment checkpoint

The Astra review is complete: the existing Next.js deployment is the approved
Node-runtime BFF host, subject to the binding contract above. Before hosted
DEV/QA acceptance, confirm the isolated server-side service credential and the
exact app-link configuration. Required tests include direct client RPC denial;
no privileged credentials or service-RPC names in native source/bundles;
forged, expired, and replayed grant denial; existing-account non-upgrade;
malformed or over-posted payloads with zero side effects; rejected/missing/
invalid bearer requests that never reach a service RPC; non-Giver and
cross-user funding denial; changed-offer/price failure; duplicate confirmation;
and confirmation-link allowlist rejection. Run the hosted set only after
confirming `0021` and `0022` are applied.
