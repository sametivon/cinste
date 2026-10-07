# Database maintenance

## Implementation and boundary

Migrations `0018` through `0020` add system audit attribution, a private runner,
and one inactive Supabase Cron job. No HTTP endpoint, Edge Function, JWT,
service-role key, or system user is involved. Historical migrations and
`expire_stale_claims()` are unchanged.

`impact_audit_events.actor_kind` defaults to `human`; existing events and human
writers retain their profile ID. Only `system` participation expiration/overdue
events may have a null actor ID. Unattended flexible expiration leaves
`resolution_actor_id` null; the audit event identifies the system actor.
Authenticated opportunistic expiration preserves `auth.uid()` attribution.
Audit immutability and all existing RLS policies remain unchanged.

Direct execution of `expire_impact_participations()` is revoked from PUBLIC,
anon, authenticated, and service_role. The postgres-owned trusted join RPC can
still invoke it. `cinste_private.run_maintenance()` is SECURITY INVOKER, owned
by postgres, with no API-role schema or execution privileges. It calls claim
expiration first, then Impact expiration, in one transaction. Errors propagate;
the next scheduled invocation retries all still-eligible records.

The job `cinste-maintenance-v1` uses `*/5 * * * *`, runs as postgres in the
local database, and has a 240-second statement timeout. Creation and
deactivation occur inside the same atomic DO statement: an active job is never
committed during installation. Replaying the registration reconciles the
same owner's named job and leaves it inactive.

## Validation

Run `npm run test:scheduler`. This uses disposable in-memory PostgreSQL
(PGlite), applies the real application migrations through `0019`, and never
loads environment credentials or connects to Supabase. It covers grants,
system/human attribution, nested execution, constraints, duplicate requests,
inventory restoration, rollback/retry, timing boundaries, and unchanged RLS
and Core expiration source. Auth/Storage platform scaffolding is test-only.

PGlite has no pg_cron worker or multiple database sessions. The Cron test
executes the tracked registration against an explicitly named test double;
it checks registration, deactivation, replay, and atomic failure, not the real
extension or scheduling runtime. Queued duplicate calls are not evidence of
multi-session concurrency. Hosted production-like extension/worker, timeout,
and concurrent user-transaction checks remain required before activation.

The existing Batch 2 hosted fixture now triggers expiration through the real
student join RPC, since its former direct maintenance call is intentionally
denied. Do not run any fixture/integration script against production.

## Owner-operated promotion and activation

No deployment or activation is authorized by this document.

1. Verify the isolated target project and migration history using the existing
   controlled promotion process. Never put production credentials in local QA
   environments. Keep actual project references and credentials platform-managed.
2. Verify Supabase supports/enables pg_cron, then apply the ordered migrations
   as postgres. Migration `0020` installs the extension if needed and fails
   rather than silently skipping unsupported setup. No secrets are configured.
3. Inspect `cron.job`: exactly one CINSTE job, expected command and five-minute
   schedule, username postgres, local host/database, and `active = false`.
   Check function owners/ACLs, no API-role access to the private schema or Cron
   configuration, and no untrusted CREATE privilege in trusted schemas.
4. Validate on an isolated non-production database, including real concurrent
   execution, rollback, and a temporarily enabled Cron run. Disable the QA job
   afterward. Local/dev schedules remain optional and inactive by default.
5. Before separately authorized production activation, configure the monitoring
   below and verify production-only targeting. Activate only the inspected job
   ID with `cron.alter_job(..., active := true)` as the deployment owner. Never
   enable jobs automatically during schema promotion. Record project, commit,
   job ID, operator, UTC time, and verification results in the deployment record.
6. To stop scheduling, set that job inactive. Inactivation does not cancel an
   already running transaction. No QA seeds, resets, policy activation, remote
   database connections, or fixture jobs belong in the production command.

## Monitoring still required

Use `cron.job_run_details` and database logs for status, duration, and sanitized
errors. Alert after two consecutive failures or fifteen minutes without a
successful run; missing-run detection must be independent of this job. Track
oldest eligible unprocessed records and repeated timeouts/deadlocks. Investigate
repeated failures rather than adding an immediate retry loop or new locks.

The runner returns separate expired-claim and participation-transition counts.
Cron command status such as `SELECT 1` is not those counts and must not be
reported as processed inventory. Persisting/exporting counts and alert delivery
remain observability follow-up. Retain about thirty days of Cron history and
arrange bounded pruning; pg_cron does not automatically remove history. Never
log redemption credentials, verification documents, or student identities.

## Separate existing Core issue

`0014`'s `expire_stale_claims()` updates a claim's status and then attempts to
update its restoration timestamp again within the same data-modifying CTE.
PostgreSQL does not reliably support updating the same row twice in one
statement. The timestamp is therefore not reliable restoration evidence.
Current idempotency uses `status = 'active'`, not this marker. This batch leaves
the function untouched; a separately scoped Core fix and marker assertions are
needed. Scheduler tests verify actual status/inventory effects without claiming
that the marker is correct.
