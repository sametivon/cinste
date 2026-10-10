# CINSTE Legal and Compliance Implementation Plan

Status: implementation sequence approved for internal planning; public legal
content is not approved for publication.

This plan is based on the repository audit completed on 2026-10-10. It does not
claim that CINSTE is legally compliant. A Romanian lawyer and accountant must
approve the legal entity, commercial model, policies, and CAEN scope before
public release.

## Corrected order

### Milestone 0: Legal authority and commercial model

Owner/accountant/legal inputs required:

- exact contracting entity, legal name, CUI/CIF, registered address, and contact
- PFA or SRL decision
- current CAEN Rev.3 primary and secondary activities
- VAT status and invoicing model
- whether CINSTE sells, intermediates, or only facilitates experiences
- contracting party for Givers, Students, Partners, and Organizations
- payment-funds flow and responsibility for refunds
- final canonical domain and support address
- age policy for Core Student features and Impact

No public legal copy or payment implementation should start before this
milestone is approved.

### Milestone 1: Approved policy set

Prepare and approve versioned Romanian-first documents:

- Terms of Service
- Privacy Policy
- Cookie and analytics notice
- Refund and cancellation policy
- Complaints and support procedure
- Student and Impact safety notice
- Organization/Partner terms and data-use rules
- Giver payment and consumer disclosures
- DSA terms, notice/action, moderation, and appeal rules where applicable

Each document needs an owner, effective date, version, language, and change
history.

### Milestone 2: Public legal surfaces

Implement canonical web routes and footer/header entry points for the approved
documents. Add equivalent mobile entry points through external links. Add:

- signup Terms and Privacy acknowledgement
- separate optional marketing consent, if used
- Impact email-disclosure explanation before joining
- support and complaint entry points
- ANPC/SAL information using the current ANPC route
- DSA contact/report/appeal entry points where applicable

Do not publish draft or placeholder legal text.

### Milestone 3: Privacy operations

Implement server-authoritative:

- account deletion request and review flow
- data access/export request flow
- rectification and restriction request handling
- consent and policy-version records
- retention schedule and deletion exceptions
- processor/Organization disclosure records
- audit trail for requests and decisions

Deletion and retention changes require a separate security review.

### Milestone 4: Payments and consumer operations

Only after the merchant model is approved:

- real provider integration
- checkout disclosures and acceptance capture
- invoice/receipt handling
- refund/cancellation workflow
- chargeback and reconciliation handling
- payment support and complaint escalation
- removal of mock-payment production paths

### Milestone 5: Production and App Store release gate

Verify:

- legal links in web and mobile journeys
- App Store privacy declarations and policy URL
- account deletion path
- permission-use descriptions
- production provider identity and domain
- accessibility of legal and consent surfaces
- DSA/ANPC/SAL operational contacts
- production-like role and complaint tests

## Current blocker

The repository contains no authoritative PFA/CUI/registered-address data and no
approved commercial/payment contracting model. The current web and mobile
signup, account, checkout, and Impact flows therefore cannot safely receive
final legal copy yet.

## Safe implementation boundary

Until Milestone 0 is approved, only internal planning, inventory, tests, and
non-public scaffolding are permitted. Do not expose placeholder legal pages,
invent provider identity, or enable real payments.
