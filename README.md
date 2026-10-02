# CINSTE local MVP

CINSTE is a local multi-category platform for funding and redeeming student treats. It models **Partner → Offer → Campaign → Claim → Redemption**, rather than restaurants or food delivery.

## Run locally

1. Copy `.env.example` to `.env.local` and add your Supabase project URL, publishable key, service-role key, and `http://localhost:3000`.
2. In Supabase SQL Editor, run `supabase/migrations/0001_cinste.sql`, then `supabase/migrations/0002_analytics_tracking.sql`, `supabase/migrations/0003_pgcrypto_schema_qualification.sql`, `supabase/migrations/0004_offer_localization_key.sql`, `supabase/migrations/0005_payment_claim_validity.sql`, `supabase/migrations/0006_verification_lifecycle_deactivation.sql`, `supabase/migrations/0007_fix_verification_lifecycle_trigger.sql`, `supabase/migrations/0008_campaign_read_policy_function_grant.sql`, `supabase/migrations/0009_admin_operations.sql`, `supabase/migrations/0010_final_core_hardening.sql`, then `supabase/seed.sql`.
3. For a local Supabase CLI database only, run `supabase/seed-test-users.sql`. Do not run it against a hosted project because it writes to `auth.users`.
4. `npm install`
5. `npm run dev`

Open `http://localhost:3000`. The local fixture password is `cinste-local-2026`.

## Web and mobile boundary

The public website is a multilingual CINSTE landing page. Student account, offer, claim, and verification URLs hand off to the student app through `NEXT_PUBLIC_STUDENT_APP_URL`, which defaults to the `cinste://` scheme declared by Expo. Set that value to the current Expo development URL while testing with Expo Go; use the stable `cinste://` scheme in a development build or future released app.

Admin, Partner, Giver, and QR redemption workflows remain web-first operational workspaces. The public website does not load student marketplace inventory.

## Hosted development test accounts

Run `npm run bootstrap:test-users`. The command uses the server-only service-role key from your local environment; it never sends that key to the browser or creates a web endpoint. It refuses to run with `NODE_ENV=production`, only updates accounts marked `cinste_test_data`, and needs the seed partners/universities already present.

It creates these idempotent hosted-project accounts with password `cinste-local-2026`: verified student, pending student, resettable unverified student, giver, café partner, cinema partner, barber partner, and admin. Re-running the command resets only `unverified.student@cinste.test` to have no student profile or verification submission, so it is safe for the document-upload QA path. Open `/dev/testing` locally for account credentials, inventory, and direct workspace links. The route returns 404 in production.

For a fresh physical-device claim and QR smoke test, run `npm run reset:test-verified-student`. This development-only CLI requires the server-side service-role variable, refuses `NODE_ENV=production`, verifies the fixture's Auth `cinste_test_data` marker, and only removes `verified.student@cinste.test` claims. Any active reservation for that same fixture is released to its campaign before removal. It is not an application endpoint and is unavailable to web or mobile clients.

Run `npm run test:integration` to exercise the hosted development project through real Auth sessions, RLS policies, and claim/redemption/payment RPCs. It creates timestamped `QA ·` campaigns and marked `qa.*@cinste.test` accounts, then deactivates the temporary campaigns after the run. It refuses `NODE_ENV=production`.

Sign in as `admin@cinste.test` and use `/admin/manage` to add universities, categories, partners, offers, campaigns, and partner-user assignments.

| Role | Account |
| --- | --- |
| Verified student | `student.verified@cinste.local` |
| Pending student | `student.pending@cinste.local` |
| Giver | `giver@cinste.local` |
| Café partner | `cafe@cinste.local` |
| Cinema partner | `cinema@cinste.local` |
| Barber partner | `barber@cinste.local` |
| Admin | `admin@cinste.local` |

## Architecture and security

The App Router uses `@supabase/ssr` cookie clients. Server actions validate input with Zod and authenticate through Supabase Auth. The service-role key is not sent to the browser; it is used only by the trusted server action that initializes a pending payment record after it has authenticated the giver. Normal user mutations use RLS and database RPCs.

Student documents live in the private `student-documents` bucket. Storage enforces PDF/JPEG/PNG declarations and a 5 MB limit; the verification RPC also checks that the object exists, belongs to the submitting student, and matches its stored MIME/size metadata. Students can upload under their own folder; only admins can read documents. Auth registration does not confer student verification; only an admin can change verification state. Storage validates the declared MIME type, not file binary content: malware scanning and content-signature verification require separate processing infrastructure and are outside this local MVP.

RLS gives students their own profiles, verifications, claims and claim secret, givers their own orders, and partners claim/redemption visibility only for mapped partners. Admin policies permit operational management. A separate `claim_secrets` table prevents partner history reads from receiving bearer redemption tokens.

## Transaction design

`claim_campaign` runs in PostgreSQL, locks the student with an advisory transaction lock, checks verified state and the rolling 24-hour claim limit, locks the campaign, decrements availability, writes the claim and token hash, and records the bearer token only in the student-private secret table. It cannot produce negative inventory or double-allocate the final unit.

`expire_stale_claims` transitions permanently invalid active claims. An elapsed claim reservation restores inventory only while its campaign can still accept claims; a finished campaign or event never receives unusable inventory. It runs before claims and during redemption. Run `npm run maintenance:expire-claims` locally when needed; a future production scheduler should call the same service-only database function.

`inspect_redemption` and `redeem_claim` hash the opaque 256-bit token server-side, check mapped-partner authorization, and lock the claim before changing it to redeemed. A second redemption returns `ALREADY REDEEMED`.

## Payments and fulfillment

`MockPaymentProvider` creates checkout, order items, and its pending payment through a service-only database function using trusted offer prices. The browser cannot execute payment confirmation directly. The authenticated server action verifies order ownership, then invokes the service-only confirmation function, which revalidates payment, totals, item prices, offer/partner activity, and idempotency before inventory is created. A provider webhook can later call this same trusted confirmation boundary.

Offers support `instant`, `appointment_required`, and `scheduled_event`. Booking and event information are display-only; CINSTE QR redemption remains authoritative.

## Validation

Run `npm run typecheck`, `npm test`, and `npm run build`. Stop `npm run dev` before building because both use `.next`.

The migration contains the authoritative high-risk controls: role/RLS checks, atomic inventory decrement, claim expiry restoration, 24-hour limits, partner binding, and idempotent redemption. Manual QA should follow the Coffee, Cinema, Haircut, and Mock Giver Purchase flows in the build specification, including payment failure, sold-out/future/ended campaigns, expiry, and wrong-partner redemption.

## Known MVP limits

No production payments, scheduling, external analytics, or job scheduler is included. Camera scanning uses ZXing with manual token entry fallback. A future deployment should add a scheduled trusted service-role call to `expire_stale_claims`.
