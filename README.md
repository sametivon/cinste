# CINSTE

CINSTE is a Romania-first, multi-category student experience and reciprocal-generosity platform. Givers fund experiences, verified students claim and redeem them, and students can pass that generosity forward through community Impact. It is not a food-only product.

CINSTE is mobile-first. Student and Giver core consumer journeys belong in the
native app. Partner and Organization Operator require both operational web
portals and native capability for relevant on-the-go work. Admin remains a
web-first operational control plane.

## Product surfaces

- **Public web:** discovery, acquisition, app handoff, login, and entry to
  Partner/Organization operational portals.
- **Student mobile:** verification, discovery, claims, QR, profile, and Impact participation.
- **Giver mobile:** required core funding, My Giving, outcomes, and return journey; not yet implemented.
- **Giver web:** existing funding and My Giving capability, retained as a transitional/complementary surface.
- **Partner web + mobile:** required operational portal plus on-the-go redemption and concise operational context; web exists, native does not.
- **Organization Operator web + mobile:** required portal plus relevant daily mobile operations; web exists, native does not.
- **Admin web:** the comprehensive system operations control plane; the current workspace is functional but incomplete against that target.

Student web is intentionally a native-app handoff. Redemption is always
server-authoritative: partner scan/manual-code input is validated and redeemed
through the protected backend flow. Surface expansion does not change role,
assignment, funding, RLS, RPC, or Impact authority.

## Tech stack

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase Auth, Postgres, RLS, Storage, and RPCs
- Expo, React Native, Expo Router, and SecureStore
- Zod, Vitest, and focused hosted integration runners

## Repository structure

- `app/` - Next.js web routes, server actions, and public/operational surfaces
- `apps/mobile/` - Expo application; currently Student-only in implementation,
  intended to serve Student, Giver, and approved Partner/Organization journeys
- `supabase/migrations/` - ordered database schema, RLS, and RPC migrations
- `scripts/` - local maintenance, QA fixture, and hosted integration scripts
- `docs/` - product, current-state, architecture, brand, and design references

## Local setup

1. Clone the repository and install web dependencies:

   ```bash
   npm install
   ```

2. Install mobile dependencies:

   ```bash
   npm --prefix apps/mobile install
   ```

3. Copy `.env.example` to `.env.local` and supply your own Supabase URL, publishable key, server-only service-role key, and local app URLs. Never commit `.env.local` or share its values. `NEXT_PUBLIC_*` values are browser-safe configuration; `SUPABASE_SERVICE_ROLE_KEY` is server-only. The mobile startup script copies only the two public Supabase values into its ignored local environment file.

4. Apply the SQL files in `supabase/migrations/` in numeric order through the approved Supabase workflow for your local or non-production project. There is no checked-in Supabase CLI project configuration. Do not use migrations or seeds against production without explicit authorization.

5. Start the web app:

   ```bash
   npm run dev
   ```

6. Start the mobile app from the repository root:

   ```bash
   npm run mobile
   ```

   This copies only the required public Supabase configuration into the mobile app's local environment file before starting Expo.

## Development and QA data

`npm run bootstrap:test-users` and the reset scripts create or reset marked QA fixtures in a configured non-production Supabase project. They require local server-only credentials and refuse `NODE_ENV=production`; still verify the target project before running them.

The test-fixture password is intentionally not documented here. Obtain credentials through private onboarding or local setup, never from the repository README. `/dev/testing` is a development-only helper and is unavailable in production.

`supabase/seed-test-users.sql` writes to `auth.users`; use it only with a local Supabase CLI database, never a hosted project. Hosted integration runners create QA data and should likewise be run only against approved non-production infrastructure.

## Common commands

### Web

```bash
npm run dev
npm run build
npm run typecheck
npm test
```

### Mobile

```bash
npm run mobile
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
```

### Non-production QA / maintenance

```bash
npm run bootstrap:test-users
npm run reset:test-verified-student
npm run reset:test-unverified-student
npm run maintenance:expire-claims
npm run test:integration
npm run test:integration:impact
npm run test:integration:impact:batch2
npm run test:integration:impact:batch3
npm run test:integration:impact:batch4
npm run test:integration:impact:batch5
npm run test:integration:giver-outcomes
```

Stop the web development server before `npm run build`, since both use `.next`.

## Architecture and security

- Supabase RLS and protected server actions/RPCs remain the authority boundary; clients do not authorize funding, claims, verification, or redemption.
- A verified student claims available campaign inventory; authorized partners redeem the QR/manual-code credential through the server-authoritative flow.
- QR and manual redemption codes are bearer credentials. Do not log, expose, or add them to fixtures or documentation.
- Student verification documents are private. The service-role key is server-only and must never reach the browser or mobile bundle.
- Organization access comes from active organization assignments, not a second mutable role system.
- Giver outcomes are self-scoped and privacy-suppressed for small cohorts; Givers never receive direct student identity data.

For deeper decisions and constraints, start with [AGENTS.md](AGENTS.md), [the project overview](docs/decisions/project.md), [the current state](docs/current/current-state.md), and the relevant feature documentation.

## Current V1 status

Core claim and redemption flows, student verification, partner assignment
controls, and the native Student app are implemented. Impact backend and V1
workflows are implemented through the current migration set. The mobile app
currently blocks every non-Student profile at a role-boundary screen, so native
Giver, Partner, and Organization Operator journeys remain unimplemented.

The public landing and student mobile UI have a provisional V1 brand/design pass. Authentication and workspace routing are assignment-aware; Organization Operator and Admin Impact workspaces, Partner Redemption Core, and the Giver My Giving UI are present. Migrations through `0022` are owner-confirmed applied to hosted development/QA; hosted behavioral validation of `0022` remains pending. The maintenance Cron registered by `0020` is intentionally inactive, and secure Giver provisioning in `0021` completed 57 hosted assertions. See the operational ledger for environment-specific evidence and remaining acceptance gaps.

See [current-state.md](docs/current/current-state.md) for the authoritative
validation record and next step, and the
[cross-platform role surface audit](docs/current/cross-platform-role-surface-audit.md)
for the strategy-aligned capability matrix and roadmap. The provisional Ripple
C / Soft Echo C logo direction is not final production artwork; see
[brand.md](docs/decisions/brand.md).

## Production limitations

- Payments remain mock-only; no live payment provider or webhook integration is complete.
- Production deployment/domain, scheduler, monitoring, observability, release/signing, and final physical QA are still pending.
- The V1 logo geometry, long-term palette, typography, motion, and illustration/icon direction remain provisional.

Production setup and migration ownership are documented in
[docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md). Do not use local
QA, seed, reset, integration, or maintenance commands against a production
project.

## Working with AI agents

Start from the repository root and follow [AGENTS.md](AGENTS.md).
See the [Turkish AI workflow guide](docs/guides/ai-ile-calisma.md) for ai-kit setup, hooks, and daily commands.

## Working on CINSTE

1. Reconcile `main` and follow the current Git workflow in [AGENTS.md](AGENTS.md); do not invent a conflicting branch or push policy.
2. Follow [AGENTS.md](AGENTS.md) and read only the docs relevant to the change.
3. Keep the change scoped; preserve RLS, server-authoritative, privacy, and role boundaries.
4. Run the smallest relevant validation set.
5. Push the branch and open a pull request with the scope and validation results.
