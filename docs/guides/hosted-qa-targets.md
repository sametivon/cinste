# Hosted QA target checks

All hosted fixture, integration, validation, and claim-maintenance scripts in
`scripts/` call `requireHostedQaTarget()` before they create a Supabase client.
Do not use these scripts for Production maintenance.

## Configuration

Use a local, non-committed `.env.local` file. Keep the service key private.

- Set `CINSTE_QA_PROJECT_REFS` to the approved DEV/QA project references. Use
  comma-separated, 20-character lowercase letters and digits. Do not use spaces,
  wildcards, URLs, or Production references. There is no default list.
- Set `NEXT_PUBLIC_SUPABASE_URL` to the exact HTTPS origin for one listed
  project: `https://<project-reference>.supabase.co`. One final `/` is permitted.
- Set `CINSTE_HOSTED_QA_VALIDATION=1` only for an approved hosted operation.
- Keep each script's existing required keys and acknowledgements. The funding
  eligibility runner also requires `CINSTE_VALIDATE_0022=1`.

The check rejects custom domains, local endpoints, credentials in URLs, ports,
paths, queries, fragments, encoded hosts, and malformed references. It rejects
`NODE_ENV=production`, `VERCEL_ENV=production`, and any non-empty `CI` value.
A non-production process environment alone does not permit a target.
Errors do not include the supplied URL, references, or credentials.

The list is an operator-controlled safety boundary. It prevents accidental
selection of an unlisted target. It does not prove that a listed project is QA,
validate credential provenance, or stop an operator who changes the list or
code. Verify project ownership and purpose before configuration. Keep Production
credentials and QA configuration separate. Do not supply QA acknowledgements or
allow-lists to CI or deployment environments. A passing target check is not
permission to reset fixtures or change a live database.

## Offline validation

Run `npm run test:qa-target` for the security checks. `npm test` also runs them,
so the existing read-only validation workflow runs this suite without secrets.
The tests use synthetic configuration and intercept Supabase client creation.
They execute each script's preflight but make no hosted request. A positive
preflight test stops at the intercepted client constructor; it does not execute
the hosted operation.

Run the repository validation commands:

```sh
npm run typecheck
npm test
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
```

Do not run a `test:integration*`, bootstrap, reset, or maintenance command as an
offline test. These commands change hosted state after their checks pass.

## Scope

No migration, RLS, RPC privilege, product Auth, or scheduler configuration is
changed. `sync-mobile-env.mjs` only copies public local configuration and does
not contact Supabase; it is not a hosted operation. Existing fixture passwords
and other readiness findings remain separate work. This check does not establish
hosted acceptance or Production readiness.
