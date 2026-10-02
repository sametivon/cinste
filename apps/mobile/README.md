# CINSTE Student App

The Expo application in this folder is the iPhone-first student experience for CINSTE. The existing Next.js app remains the workspace for admins, partners, and givers.

## Run on Windows

From the repository root:

```powershell
npm install
npm run mobile
```

`npm run mobile` copies only the public Supabase URL and publishable key from the root `.env.local` into `apps/mobile/.env.local`, then starts Expo. It never copies the service-role key.

Install Expo Go on an iPhone, keep the phone and Windows machine on the same network, then scan the QR code printed by Expo. Use `npm --prefix apps/mobile run start -- --tunnel` when the local network blocks device discovery.

## Test accounts

Run the existing root bootstrap when the hosted test accounts need refreshing:

```powershell
npm run bootstrap:test-users
```

Then sign in with `verified.student@cinste.test` and the documented development password in the root README. Use the student account’s own active claim or a fresh seeded campaign when testing the QR flow.

## Checks

```powershell
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
```

The app uses the hosted project’s RLS, private storage policies, and PostgreSQL RPCs. It has no service-role key, admin capability, partner capability, or browser-cookie dependency.

## Languages

The student app supports Romanian (default), English, Turkish, and Arabic. On first launch it uses a supported device language; otherwise it falls back to Romanian. A choice under **Profile → Language** is stored locally in Expo SecureStore and takes priority on later launches.

Arabic applies RTL-aware text alignment and row layout in the student experience immediately. The QR and manual redemption code remain direction-neutral. The app deliberately does not force a global `I18nManager` restart when changing languages, so a language choice never disrupts an active claim or authentication session.
