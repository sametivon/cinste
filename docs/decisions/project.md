---
tur: adr
durum: kabul
tarih: 2026-10-07
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

### Locked platform strategy

CINSTE is a mobile-first product. The current implementation does not by itself
define the intended final surface for a role.

- Student core consumer journeys belong in the native mobile app.
- Giver core consumer journeys belong in the native mobile app. Existing Giver
  web functionality is useful transitional and complementary capability, but
  it does not satisfy the native product requirement.
- Partner requires an operational web portal and native capabilities for work
  that naturally happens on the go.
- Organization Operator requires an operational web portal and native
  capabilities for relevant daily operational work.
- Admin remains a web-first operational control plane. Native Admin capability
  requires a later, concrete owner-approved operational need.
- Public web is primarily for discovery, acquisition, app handoff, login, and
  access to Partner and Organization operational portals.

Surface placement follows the journey and operating context while preserving
one server-authoritative role, assignment, RLS, and RPC model across clients.
Adding a native surface never grants authority or creates a second role system.

### Intended role surfaces

| Role | Native mobile | Web |
| --- | --- | --- |
| Student | Canonical authenticated product: verification, discovery, claims, QR, profile, and Impact | Public discovery, acquisition, login, and app handoff; no parallel authenticated Student product is currently intended |
| Giver | Canonical core consumer journey: acquisition continuation, authentication, funding, contribution history/outcomes, and return funding | Acquisition/login and transitional or complementary funding/outcome capability; web parity does not replace native completion |
| Partner | On-the-go operational tasks, especially scan/manual redemption, result handling, and concise recent context | Required operational portal for staffed workflows, account access, redemption, history, and future portal-scale operations |
| Organization Operator | Relevant daily work such as action queues, participant completion/outcome handling, context switching, and timely status | Required operational portal for opportunity authoring/lifecycle, broader queues, history, and multi-record management |
| Admin | No approved native surface | Comprehensive operational control plane for the full CINSTE system |

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
