# CINSTE Production Readiness

Audit date: 2026-10-07. This is a repository audit, not evidence that any
production service has been configured. “Hosted validation” below means the
documented non-production Supabase environment only.

## Executive status

**EXTERNAL-BETA BLOCKED.**

The V1 application, RLS/RPC boundary, role workspaces, native student app, and
focused hosted non-production assertions are substantially implemented. The
repository does not provide evidence of a separately configured production
environment, production deployment and migration process, scheduler,
observability, iOS release/signing path, or final physical acceptance. Funding
is intentionally mock-only, so a public beta that includes real Giver funding
cannot launch safely.

Current evidence should be read as follows:

| Area | Evidence level |
| --- | --- |
| Core, Impact, and Giver-outcome database behavior | Implemented; focused hosted non-production validation recorded |
| Web and mobile V1 surfaces | Implemented; local/type and selected browser/physical validation recorded |
| Production Supabase, web, and mobile environments | Not evidenced in the repository |
| Real money collection | Not implemented; mock provider only |
| Production operations, monitoring, and release process | Not implemented/evidenced |

## Launch blockers

### BLOCKER — Real payments are absent

- **Affected surface:** Giver funding and every campaign funded through it.
- **Current state:** `createOrder` calls the service-only
  `create_mock_checkout` RPC and `completeMockPayment` accepts a mock success
  value before calling `confirm_mock_payment`. The database derives offer,
  quantity, and amount at the trusted boundary, which is a useful provider
  seam, but no provider session, signed webhook, or reconciliation exists.
- **Required action:** Deliver real payments as a separate workstream: provider
  selection, checkout/session creation, webhook signature verification,
  idempotent provider-event processing, trusted amount/currency validation,
  pending/failure/retry handling, refund/chargeback policy, reconciliation, and
  support runbook. Remove mock completion from any production route.
- **Astra/security review before implementation:** **Yes.**

### BLOCKER — Production environments and deployment controls are not established

- **Affected surface:** all web, mobile, Auth, Storage, and database traffic.
- **Current state:** local `.env.local` is excluded and examples define a
  Supabase URL, publishable key, service-role key, web URL, and student-app
  URL. The mobile example contains only public Supabase values. There is no
  checked-in Supabase project configuration, Vercel configuration, preview or
  production environment manifest, or evidence of separate production Auth,
  Storage, redirect, domain, and secret configuration. Repository instructions
  explicitly limit migration application to approved local/non-production use.
- **Required action:** create distinct local, hosted development/QA, preview,
  and production projects/configurations; document the deployment owner and
  promotion procedure; configure production Auth site URL and allowed redirects,
  private storage, web/mobile public URLs, server-only secrets, domain/TLS, and
  a migration ledger with rollback/backup procedures. Production must never
  inherit QA credentials or point a preview at the production service-role key.
- **Astra/security review before implementation:** **Yes**, for the production
  migration/RLS/grant verification and secret boundary review.

### BLOCKER — Production maintenance scheduler is not deployed or monitored

- **Affected surface:** claim inventory, expired claims, scheduled-event
  claimability, and Impact participation overdue state.
- **Current state:** `expire_stale_claims` is invoked opportunistically by
  claim/redemption paths and a local maintenance script. That script refuses
  production. `expire_impact_participations` is similarly invoked by selected
  Impact RPCs. New migrations `0018` through `0020` now implement explicit system
  attribution, restricted maintenance execution, an atomic private runner, and
  one five-minute database-local Cron job, inactive by default. Migrations
  `0018` through `0020` are owner-confirmed applied to hosted development/QA;
  the job remains intentionally inactive. Without an active scheduler or
  successful opportunistic calls, expiration/restoration and overdue state
  remain stale.
- **Required action:** follow `docs/guides/database-maintenance.md` for controlled
  promotion, real Cron/concurrency verification, monitoring, and separately
  authorized owner activation. Nine isolated PostgreSQL tests pass; the Cron
  registration test uses a test double, not a live worker. Both operations use
  the shared five-minute cadence to avoid a separate Impact dispatcher/job.
- **Astra/security review before implementation:** **Yes**, because execution
  identity, function grants, and maintenance mutation paths are privileged.

### BLOCKER — iPhone release configuration is incomplete

- **Affected surface:** student V1, which is iPhone-first.
- **Current state:** the Expo app has a name, scheme, icons/splash assets,
  SecureStore-based native sessions, and public Supabase environment names. It
  has no `ios.bundleIdentifier`, EAS build configuration, release profile,
  signing/Apple team configuration, or production build evidence. The app uses
  document and image pickers for verification; production iOS permission copy
  and App Store privacy declarations are not present in app configuration.
- **Required action:** establish EAS build profiles and credentials outside the
  repository, set the final bundle identifier and production public environment,
  supply final icon/splash assets, configure and test required privacy usage
  descriptions, complete App Store Connect privacy metadata, and validate a
  TestFlight build on physical iPhones.
- **Astra/security review before implementation:** No for signing alone; **yes**
  if release configuration changes authentication/deep-link security.

### BLOCKER — Required real-user operational and legal entry points are absent

- **Affected surface:** public web and iOS beta users.
- **Current state:** no privacy policy, terms, support/contact path, or account/
  data-deletion handling was found in the application or mobile release
  configuration. The current logo direction is also expressly provisional.
- **Required action:** obtain owner/legal-approved policy and terms URLs, add
  an accessible support route, define and implement the supported account/data
  deletion process, complete App Store privacy disclosures, and approve final
  production branding assets before public submission.
- **Astra/security review before implementation:** No, unless deletion work
  changes authorization or retention boundaries.

### HIGH — Production observability and incident response are absent

- **Affected surface:** web runtime/server actions, Supabase RPCs, mobile,
  payment provider, redemption, and scheduled jobs.
- **Current state:** no Sentry or equivalent application error capture was
  found. Console output exists in local scripts only. The current Admin UX is
  not an incident-monitoring system, and the prior audit correctly defers an
  alerting view until trusted observability exists.
- **Required action:** add a minimal stack: Sentry for Next.js and Expo crashes
  (with PII scrubbing), Vercel deployment/runtime logs, Supabase database/Auth/
  API logs, and scheduler/payment failure alerts. Define an on-call contact,
  severity threshold, retention, and a safe correlation identifier policy that
  never logs bearer redemption credentials or verification documents.
- **Astra/security review before implementation:** **Yes**, for telemetry data
  minimization and redaction.

### HIGH — QA protection relies on process environment, not target allow-listing

- **Affected surface:** Auth users, fixture records, claims, inventory, and any
  Supabase project whose service-role key is placed in a local environment.
- **Current state:** bootstrap, reset, maintenance, and hosted integration
  scripts refuse `NODE_ENV=production`; QA fixture users are marked before some
  destructive resets. The scripts still accept whichever Supabase URL and
  service-role key are supplied, and integration runners create/modify hosted
  data. A mistaken production URL with a non-production `NODE_ENV` would bypass
  the intended protection.
- **Required action:** before production credentials exist, require an explicit
  non-production project reference/allow-list for every mutating QA script;
  move fixture credentials to a non-committed secret source; ensure production
  CI/deployment environments cannot run these commands; and add a release
  check that `/dev/testing` is absent in the production build.
- **Astra/security review before implementation:** **Yes.**

### HIGH — Production database rollout has no recorded verification gate

- **Affected surface:** Supabase schema, RLS, Storage policies, and privileged
  RPCs.
- **Current state:** migrations `0001` through `0021` are ordered and include
  explicit RLS policies plus many SECURITY DEFINER/execute-grant hardening
  steps. Current documentation records application and focused assertions in a
  non-production project, including the self-scoped Giver outcome RPC. There is
  no production migration application record, schema/grant diff procedure,
  backup/restore rehearsal, or post-apply smoke gate.
- **Required action:** create a controlled migration promotion procedure with a
  production backup, single operator, ordered immutable migration application,
  pre/post schema and function-grant checks, authenticated role smoke tests,
  storage-policy checks, and documented rollback/forward-only recovery. Do not
  run seeds or QA fixture scripts in production.
- **Astra/security review before implementation:** **Yes.**

### HIGH — Final acceptance coverage is incomplete

- **Affected surface:** Impact, assignment changes, mobile and operational role
  workflows.
- **Current state:** the current-state document records passing focused hosted
  suites and some physical checks, but retains manual/physical work for partner
  assignment revocation, organization switching, verification-loss history,
  localized error states, and overdue-review requests. These are not production
  acceptance evidence.
- **Required action:** complete the launch-critical matrix below against the
  production-like environment, retain evidence, and repeat only the affected
  cases after production configuration or payment changes.
- **Astra/security review before implementation:** No; security review the
  underlying changes if any are needed.

### MEDIUM — Service-role use is narrow but needs production hardening

- **Affected surface:** mock checkout boundary and protected Admin document
  download route.
- **Current state:** the service-role client is imported from a small shared
  module and used by server actions/route handling; it is not present in the
  mobile public environment. The protected document route first authorizes the
  requester using the normal server client and returns private, no-store
  content. The shared service-role module lacks an explicit `server-only`
  guard, and production secret access controls are not evidenced.
- **Required action:** add server-only import protection during the production
  hardening phase, restrict the secret to server runtime environments, rotate
  it during production provisioning, and perform an import/build inspection to
  confirm it cannot enter a client bundle.
- **Astra/security review before implementation:** **Yes.**

### MEDIUM — Immediate index/performance evidence is limited

- **Affected surface:** claim/redeem paths, queues, and growing Impact history.
- **Current state:** migrations add targeted indexes for new Impact queues and
  reciprocity records, and V1 uses scoped reads. No production-scale dataset,
  query plan baseline, connection limits, or rate/abuse control is recorded.
- **Required action:** before opening beyond a small beta, capture `EXPLAIN`
  plans for claim, redemption, Giver outcomes, Admin queues, and organization
  participation reads using representative data; set Supabase/Vercel limits and
  rate protections appropriate to the selected plans.
- **Astra/security review before implementation:** No, unless a proposed index
  or limit changes authorization behavior.

## Production environment architecture

Use the smallest separated V1 architecture:

| Layer | Recommendation |
| --- | --- |
| Web | Next.js on Vercel. Use distinct Development, Preview, and Production environment variable sets; previews use a non-production Supabase project and cannot receive service-role production credentials. |
| Database/Auth/Storage/RPC | One dedicated production Supabase project, separate from hosted QA. Configure production Auth site URL/redirect allow-list, private `student-documents` bucket, RLS/RPC migrations, backups, and log retention there. |
| Mobile | Expo/EAS production profile using only `EXPO_PUBLIC_*` production values. Build and distribute through TestFlight before App Store submission. Never place a service-role or payment secret in the bundle. |
| Domain | DNS/TLS through the chosen domain provider/Cloudflare as needed; set the canonical web URL and matching Auth redirect URLs. |
| Scheduled maintenance | Supabase-managed cron/scheduled invocation with least privilege, idempotent maintenance functions, logged result, and alerting. Do not run the local service-role script in production. |
| Observability | Sentry for web/mobile, Vercel logs for web, Supabase logs for Auth/API/database, and alerts for scheduler and payment webhook failures. |

Environment separation must be explicit:

| Environment | Database/Auth/Storage | Web/mobile configuration | Data rule |
| --- | --- | --- | --- |
| Local | Local or disposable project | `.env.local`; mobile receives only public values | Local seed/test data only |
| Hosted development/QA | Dedicated non-production Supabase project | QA Vercel/project configuration only | Fixture scripts and hosted assertions allowed |
| Preview | Optional; do not create a staging tier solely for naming symmetry | If enabled, use isolated non-production URLs/keys and no production service role | Sanitized/recreated test data only |
| Production | Dedicated production project | Production URLs, publishable keys, server-only secrets, provider secrets | No seeds, fixture resets, or hosted destructive test runners |

No separate staging environment is required for V1 today. The current hosted
non-production project is the development/QA environment. If Vercel Preview is
enabled, it must remain private or use isolated non-production data; it must
never use production secrets or mutate production data.

## Production environment and deployment foundation

### Ready in the repository

- The root and mobile environment examples now label public configuration and
  server-only configuration explicitly. The root ignore rules exclude local
  environment files; the mobile startup script copies only the public Supabase
  URL and publishable key into `apps/mobile/.env.local`.
- The web app is a standard Next.js App Router application. Vercel can use the
  existing `npm run build` and `npm run start` commands; no custom output mode
  or `vercel.json` is required by the current application.
- `/dev/testing` uses `NODE_ENV === 'production'` to return `404`. Vercel
  Production and Preview builds run with `NODE_ENV=production`, so the fixture
  page is not available from deployed builds. Its source still contains QA-only
  fixture details and must not be treated as a production support tool.
- The mobile app uses only `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; native sessions use SecureStore. Its
  `cinste` scheme matches the web student-handoff default. No web handoff
  includes a claim or redemption bearer credential.
- Ordered migrations `0001` through `0021` are the sole schema source of truth.
  Historical migrations remain immutable.

### Owner action required before any production deployment

1. Create a new, empty production Supabase project. Do not copy the hosted QA
   project, Auth users, Storage objects, service-role key, local seed data, or
   QA fixtures.
2. Create Vercel Production configuration with the production Supabase URL and
   publishable key as public values, and the production service-role key only as
   a server-side secret. Configure Preview separately against non-production;
   do not grant Preview the production service-role key.
3. Choose the canonical HTTPS web domain. Set it as Vercel's production domain,
   set `NEXT_PUBLIC_APP_URL` to that origin, and add the exact origin plus only
   required callback URLs to Supabase Auth. Add any required CORS/origin
   configuration at the same time.
4. Confirm Supabase Auth email/password settings match the existing flows.
   Student sign-up routes immediately to onboarding. Giver sign-up handles a
   confirmation-required null session with guidance, but the real confirmation
   callback/browser return path remains an acceptance gap. There is no
   password-reset route; recovery requires a separately scoped auth UX task
   before launch.
5. For each Expo/EAS release profile, inject only the public production
   Supabase URL/key. Keep the `cinste` scheme unless a separately reviewed
   universal-link/associated-domain rollout changes it.
6. Configure the private `student-documents` bucket and Auth redirect settings
   in the production project before allowing verification uploads.

### Environment-variable ownership

| Variable | Local development | Hosted development/QA | Vercel Production | Expo/EAS iOS |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, local/disposable project | QA project config | Production Supabase URL | Copied as `EXPO_PUBLIC_SUPABASE_URL` for the matching release profile |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | QA project config | Production publishable key | Copied as `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the matching release profile |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only | Restricted QA server/script environment | Vercel server-side secret only | Never present |
| `NEXT_PUBLIC_APP_URL` | Local web origin | QA web origin where used | Canonical HTTPS web origin | Never present |
| `NEXT_PUBLIC_STUDENT_APP_URL` | `cinste://` | `cinste://` unless a reviewed change is made | `cinste://` unless a reviewed change is made | Scheme declared in `app.json` |
| Future payment/monitoring secrets | Not set in templates | Platform secret store only when that work begins | Vercel server-side secret store only | Never present |

The deployment owner, not the repository, owns actual production values. Do not
commit production project references, service-role keys, payment keys, or
monitoring tokens. A publishable Supabase key is public by design; its safety
depends on the production project's RLS, Storage policies, and RPC grants.

### Controlled Supabase production migration workflow

This workflow is intentionally owner-operated. It does not authorize an agent
or developer to apply migrations to a production project.

1. Create the production Supabase project and record its project reference in
   the deployment runbook or platform secret store, never in committed config.
2. Take and verify a production backup before each release. Ensure the release
   operator has a tested forward-recovery procedure; existing migrations are
   additive/ordered and should not be edited after deployment.
3. From a clean, reviewed commit, apply `supabase/migrations/0001` through
   `0021` in numeric order using the owner-approved Supabase migration method.
   Do not run `supabase/seed.sql`, `supabase/seed-test-users.sql`, QA bootstrap,
   reset, integration, or local maintenance scripts.
4. Record the commit, migration names, operator, UTC time, and Supabase result
   in the release record. Verify the migration history before continuing.
5. Perform authenticated, non-destructive post-migration smoke checks for
   student self-access, Partner redemption authorization, Admin document access,
   Organization assignment isolation, and Giver-outcome field suppression.
   Confirm RLS is enabled where expected, SECURITY DEFINER functions retain
   fixed search paths, execute grants match the tracked migrations, and the
   `student-documents` bucket remains private with its tracked policies.
6. For every future database change, add a new ordered migration, review it,
   test it in hosted non-production first, then repeat this promotion and
   verification sequence. Never use ad-hoc SQL Editor changes as a substitute
   for a tracked migration.

### QA and destructive-script boundary

The current scripts fail when `NODE_ENV=production` and several reset paths
also require marked fixture accounts. That is not sufficient target isolation:
the scripts accept the Supabase URL and service-role key supplied by the local
environment. The required non-production project allow-list/confirmation
mechanism would define a new privileged safety boundary. Per the readiness
review, it is deliberately **not implemented in this task** and requires an
Astra review before implementation. Until then, production credentials must
not be placed in a machine or CI environment that can run these commands.

### Blocked for later phases

- Real payment secrets, provider URLs, and webhooks: payment workstream only.
- Scheduled maintenance is implemented and applied to hosted development/QA but
  inactive in migrations `0018`-`0020`; live worker/concurrency verification,
  monitoring, and owner activation remain pending.
- Sentry/telemetry keys and data handling: observability workstream only.
- Account deletion, email-confirmation/reset UX, universal links, and App Store
  associated domains: separately scoped Auth/mobile release work as needed.

## Implementation phases

### Phase 1 — Deployability foundation

- Provision separate production Supabase, Vercel, domain/TLS, and EAS/App Store
  ownership.
- Establish environment-variable ownership, access control, rotation, and
  preview isolation; remove production access from QA tooling.
- Define controlled migration promotion, backup, post-apply RLS/RPC/storage
  verification, and production rollback/incident procedures.
- Complete the production Auth site URL, allowed redirects, mobile deep-link
  behavior, private storage configuration, and final branding decision.

### Phase 2 — Production operations

- Promote and verify the implemented inactive scheduler for claims and Impact;
  configure monitoring before separately authorized owner activation.
- Add Sentry, platform logs, alerting, PII/bearer-credential scrubbing, and a
  short incident/support runbook.
- Harden service-role imports and test-script project allow-listing.
- Add launch-scale query-plan checks and basic abuse/rate controls where the
  selected hosting products provide them.

### Phase 3 — Payments

- Conduct provider selection and a design/security review.
- Implement checkout, signed webhook intake, idempotency, trusted amount
  verification, payment-state transitions, reconciliation, refunds/chargebacks,
  and support procedures.
- Perform provider sandbox, failure, retry, duplicate-event, and end-to-end
  funding validation before any live Giver path is enabled.

### Phase 4 — Final acceptance

- Deploy the production-like release candidate and complete the matrix below.
- Complete the pending physical Impact and assignment cases from current state.
- Test backup/restore, scheduler failure alert, rejected Auth redirect,
  production document access, and service-role non-exposure.

### Phase 5 — Release

- Obtain legal/privacy/support approval and publish required links.
- Produce an EAS/TestFlight build, complete App Store metadata/privacy review,
  and complete physical iPhone sign-in/claim/redemption validation.
- Execute the production migration/deploy runbook, turn on monitoring and
  scheduled maintenance, verify live smoke tests, and retain release evidence.

## Security-review checkpoints

Request an Astra read-only review before implementing or enabling:

1. The payment-provider design, checkout/session creation, webhook verifier,
   payment idempotency model, refunds, and reconciliation.
2. The production scheduler’s caller identity, grants, invocation path, and
   failure handling for claim and Impact maintenance.
3. The production migration promotion plan: deployed RLS, function ownership,
   SECURITY DEFINER search paths, execute grants, Storage policies, and
   service-role dependencies.
4. QA-script target allow-listing and production-secret access separation.
5. Sentry/telemetry configuration, specifically redaction of QR/manual bearer
   credentials, verification documents, student identity, payment references,
   and private partner metadata.
6. Any mobile deep-link/Auth callback change or account/data-deletion flow that
   changes access or retention behavior.

## Final beta checklist

Mark every item **yes** only with production or production-like evidence.

| Check | Yes/No |
| --- | --- |
| Separate production Supabase, Vercel, mobile, Auth, Storage, and secret configuration exists | No |
| Production Auth URL/redirect allow-list and mobile deep links are verified | No |
| Migrations `0001`–`0021` have been applied and post-apply RLS/RPC/Storage checks passed in production | No |
| Production backups and forward-recovery procedure are tested | No |
| Claims and Impact expiry scheduler is running, monitored, and tested | No |
| Real payment provider, signed webhooks, idempotency, and reconciliation are complete | No |
| No production route exposes mock payment completion or development helpers | No evidence yet |
| Service-role secret is server-only, rotated, and absent from preview/mobile/client bundles | No evidence yet |
| Sentry/platform/Supabase logs and scheduler/payment alerts are active with PII redaction | No |
| Privacy policy, terms, support, deletion process, and App Store privacy disclosures are approved/published | No |
| EAS production profile, signing, bundle identifier, permissions, icons, and TestFlight physical validation are complete | No |
| Student: auth, verification, discover, claim, QR/code, redeemed state, and Impact pass | Pending production-like QA |
| Partner: QR/manual code, wrong partner, expired, and duplicate redemption pass | Pending production-like QA |
| Giver: funding/payment, My Giving outcomes, and privacy suppression pass | Pending real-payment and production-like QA |
| Organization Operator: opportunity, participant action, completion, and review states pass | Pending physical QA |
| Admin: verification, catalog/campaign, organization, and Impact operations pass | Pending production-like QA |
| Pending physical checks from current state (assignment revocation, organization switching, verification-loss history, localized errors, overdue review) pass | No |

### Launch-critical QA matrix

| Role | Scenarios |
| --- | --- |
| Student | Sign in/out and redirect safety; submit/approve/reject verification; discover and claim; QR/manual credential display; redeemed refresh; Impact join/cancel/history/review state. |
| Partner | QR validation, manual code, wrong-partner rejection, expired claim, duplicate redemption, and no bearer credential in logs/screens. |
| Giver | Real-provider success/failure/cancel/webhook retry; ownership; funded campaign; My Giving available, privacy-suppressed, and unavailable states without student data or zero reconstruction. |
| Organization Operator | Assigned-organization isolation and switching; create/edit/publish/cancel; eligible participant completion; waiting/Admin-review/history states. |
| Admin | Protected verification document review; approve/reject; partner/offer/campaign operations; Impact organization/operator, contribution, overdue, dispute, and reasoned correction operations. |
