---
tur: adr
durum: kabul
tarih: 2026-10-02
---
# docs/decisions/project.md

# CINSTE Project

## Product
CINSTE is a Romania-first student experience platform.

Core idea:
People fund experiences for verified students, students claim them, and partners redeem them through CINSTE.

Core transaction:

Giver
→ funding
→ Campaign inventory
→ Verified Student
→ Claim
→ QR
→ Partner Redemption

## Platform boundaries

### Native mobile
Student-facing product only:
- verification
- Discover
- My CINSTE
- Claim / QR
- Profile
- future Impact experience

### Responsive web
Operational and funding surfaces:
- Giver
- Partner
- Organization Operator
- Admin
- Public landing

A user surface is separated by function, not by device ownership.

## V1 roles
Keep roles simple and separate:

- Student
- Giver
- Partner
- Organization Operator
- Admin

Do not introduce cross-role funding behavior in V1.

## Existing core architecture
Main product objects:

Partner
→ Offer
→ Campaign
→ Claim
→ Redemption

Supporting areas include:
- profiles
- universities
- student profiles
- student verification
- giver orders
- payments
- partner-user assignments
- admin operations
- analytics events

## Core rules
- student claim functionality requires verified student status
- default successful claim limit is one per rolling 24 hours
- QR redemption is authoritative server-side
- partner can only redeem assigned partner inventory
- funding inventory must not be created from untrusted browser/client state
- student mobile is recipient-oriented, not giver-oriented
- existing RLS/security boundaries must remain authoritative

## Current technology
- Next.js App Router
- TypeScript
- Tailwind
- Supabase/PostgreSQL/Auth/Storage
- Expo / React Native
- Expo Router
- Zod
- RLS

## Payments
Current payment provider is mock-only.

Real payment provider integration is future production-readiness work.

## Production-readiness items not yet complete
Examples:
- real payment provider/webhooks
- production stale-claim scheduler
- production deployment/domain
- monitoring
- release/signing
- optional document malware/content scanning

## New approved direction: CINSTE Impact

Core statement:

> People give students experiences, and students turn that generosity into community impact.

CINSTE should evolve from only a funded student-experience marketplace into a reciprocal generosity network.

Impact must extend the existing Core MVP rather than redesign it.