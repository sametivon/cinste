# CINSTE

CINSTE is a Romania-first, multi-category student experience and reciprocal-generosity platform. Givers fund experiences, verified students claim and redeem them, and students can pass that generosity forward through community Impact. It is not a food-only product.

Students use the native mobile app in V1. Funding and operational roles use the web application.

## Product surfaces

- **Public web:** localized landing and product handoff.
- **Student mobile:** verification, discovery, claims, QR, profile, and Impact participation.
- **Giver web:** fund experiences and review My Giving outcomes.
- **Partner web:** counter-first redemption with QR scanning and manual-code fallback.
- **Organization Operator web:** manage authorized organizations, opportunities, and participation work.
- **Admin web:** verification, catalog and partner operations, and Impact operations.

Student web is intentionally a native-app handoff in V1. Redemption is always server-authoritative: partner scan/manual-code input is validated and redeemed through the protected backend flow.

## Tech stack

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase Auth, Postgres, RLS, Storage, and RPCs
- Expo, React Native, Expo Router, and SecureStore
- Zod, Vitest, and focused hosted integration runners

## Repository structure

- `app/` - Next.js web routes, server actions, and public/operational surfaces
- `apps/mobile/` - Expo student application
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

3. Copy `.env.example` to `.env.local` and supply your own Supabase URL, publishable key, server-only service-role key, and local app URLs. Never commit `.env.local` or share its values.

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

Core claim and redemption flows, student verification, partner assignment controls, and the native student app are implemented. Impact backend and V1 workflows are implemented through the current migration set, with remaining manual/physical QA for scenarios such as multi-organization switching, verification-loss history, localized error states, and overdue-review requests.

The public landing and student mobile UI have a provisional V1 brand/design pass. Authentication and workspace routing are assignment-aware; Organization Operator and Admin Impact workspaces, Partner Redemption Core, and the Giver My Giving UI are present. Migration `0017_giver_outcome_read.sql` is applied to non-production, and `npm run test:integration:giver-outcomes` passed 11 hosted assertions. Authenticated `/giver` smoke checks passed for available, `privacy_suppressed`, and unavailable outcomes without exposing student-level data or rendering suppressed/unavailable metrics as zero; the workstream is ready to close.

See [current-state.md](docs/current/current-state.md) for the authoritative validation record and next steps. The provisional Ripple C / Soft Echo C logo direction is not final production artwork; see [brand.md](docs/decisions/brand.md).

## Production limitations

- Payments remain mock-only; no live payment provider or webhook integration is complete.
- Production deployment/domain, scheduler, monitoring, observability, release/signing, and final physical QA are still pending.
- The V1 logo geometry, long-term palette, typography, motion, and illustration/icon direction remain provisional.

## Working on CINSTE

1. Pull `main` and create a focused feature branch.
2. Follow [AGENTS.md](AGENTS.md) and read only the docs relevant to the change.
3. Keep the change scoped; preserve RLS, server-authoritative, privacy, and role boundaries.
4. Run the smallest relevant validation set.
5. Push the branch and open a pull request with the scope and validation results.
