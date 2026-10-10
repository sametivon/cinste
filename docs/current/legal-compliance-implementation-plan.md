# CINSTE Legal and Compliance Implementation Plan

Status: paused by owner at the external confirmation blocker; public legal
content and real payment implementation are not approved for publication or
activation.

This plan is based on the repository audit completed on 2026-10-10 and the
owner inputs recorded on 2026-10-10. It does not claim that CINSTE is legally
compliant. A Romanian lawyer, accountant, and selected payment provider must
confirm the legal entity, commercial model, policies, tax/accounting treatment,
payment structure, and CAEN scope before public release.

## Reconciled owner inputs

### Confirmed facts

- Pilot entity: `KARACA ABDULMECIT PERSOANĂ FIZICĂ AUTORIZATĂ`.
- CUI/CIF: `51422239`.
- Trade Register number: `F2025007656003`.
- EUID: `ROONRC.F2025007656003`.
- Registered professional address: `Bucureşti Sectorul 1, Bulevardul
  BUCUREŞTII NOI, Nr. 136, Etaj P, Ap. 5`.
- Current primary CAEN Rev.3 activity: `6210 Activităţi de realizare a
  soft-ului la comandă (software orientat client)`.
- Current VAT status: not registered for Romanian VAT as checked by the owner
  in the ANAF VAT registry on 2026-10-10.
- CINSTE is 18+ across the whole V1 platform: Students, Givers, Partner
  operators, and Organization operators.
- The public canonical domain and support email do not exist yet. They must not
  be invented or represented with placeholder contact details.
- Intended V1 position: CINSTE is the technology platform/facilitator layer;
  the Partner provides the underlying experience and the Organization
  operates the actual Impact activity.
- Intended contracting map: Student–CINSTE, Giver–CINSTE, Partner–CINSTE,
  Organization–CINSTE; the underlying experience is fulfilled by the Partner,
  and the Impact activity is operated by the Organization.
- Giver pricing is configurable as Partner experience value plus a CINSTE
  platform/service fee. No fee amount or percentage is locked.
- CINSTE should absorb normal payment-processing costs from its own fee by
  default. A separate payment-processing fee is not the V1 default.
- Initial Partner commission is 0%; future subscriptions, promoted visibility,
  campaign tools, analytics, and corporate programs are not V1 revenue
  features.
- Unredeemed eligible funding should normally return to the original payment
  method rather than becoming wallet or stored-value credit. Successful
  redemption is not ordinarily refundable except through an approved process.
- Impact remains financially separate from the Giver/Partner transaction:
  Students do not pay, Organizations do not pay to publish, and Impact has no
  monetary rewards or Organization payouts in V1.
- The existing Impact V1 decision remains current, including low-risk
  moderation, Admin publication approval, 18+ Impact eligibility, Organization
  authoritative attendance/completion, privacy-limited participant data,
  email-only explicit time-limited contact consent, incident review,
  no-show protections, configurable reciprocity, and aggregate Giver outcomes.

### Direction, not yet a legal conclusion

The following are intended business/product directions and must not be copied
into final legal or checkout language until professionally confirmed:

- describing CINSTE as a platform, facilitator, or intermediary;
- whether CINSTE is seller, agent, marketplace operator, payment facilitator,
  or another legally relevant role for any transaction;
- the Student–Partner legal relationship for fulfilment;
- the treatment of Partner economic value, CINSTE fee, invoices, receipts,
  commissions, and revenue recognition;
- the refund interface and economic responsibility for each root cause;
- the use of a connected-account or other provider-managed marketplace payment
  structure;
- the trigger and timing for Partner payout eligibility after redemption;
- the scope and wording of consumer withdrawal, cancellation, refund, and
  dispute rights;
- VAT, invoicing, withholding, reporting, and any threshold consequences.

No ad-hoc custody, wallet, stored-value, or manual redistribution system is
approved by these owner inputs.

## Repository reconciliation

The repository currently supports the following facts and boundaries:

- `docs/decisions/project.md` records CINSTE as a Romania-first student
  experience platform and confirms that payment is mock-only.
- The web checkout uses `completeMockPayment`; there is no real provider,
  webhook, payout, invoice, refund, or chargeback lifecycle.
- The legal audit found no public Terms, Privacy, Cookie, support, complaint,
  refund, legal, or data-request routes and no signup legal acknowledgement.
- Student mobile and native Giver signup do not yet expose the required legal
  links or acknowledgements.
- Impact migrations and decision records implement the Impact-specific
  18+ flag, email-only consent, time-limited Organization access, and
  assignment-scoped privacy boundaries. They do not implement whole-platform
  18+ enforcement or general legal consent records.
- Current analytics and the `cinste_web_locale` cookie remain implementation
  facts requiring later privacy/cookie notice and retention decisions.
- The repository does not contain a provider identity, canonical support
  address, CAEN registration record, invoice model, or payment-provider
  contract. This plan is the first internal record of the owner-provided PFA
  facts; it does not replace official/accounting evidence.

The historical Impact decision records remain unchanged. The current
`impact-v1-operating-model.md` remains authoritative for Impact; the older
`impact-spec.md` remains historical, including its superseded fixed-ratio text.

## Corrected order

### Milestone 0: Legal authority and commercial model

Owner inputs now confirmed:

- pilot entity and identity details listed above;
- current primary CAEN Rev.3 activity `6210`;
- current non-VAT-registered status;
- intended platform/facilitator business direction;
- intended contracting map;
- configurable Giver fee direction, 0% initial Partner commission, and
  preferred redemption/refund direction;
- whole-platform 18+ policy.

Still required from accountant, Romanian legal counsel, or the selected payment
provider:

- whether CAEN `6210` clearly covers the actual public platform activities;
- any additional CAEN Rev.3 activities required before public commercial
  operation, payment, Partner facilitation, corporate campaigns, or Impact
  reporting. Do not guess or add codes in the repository;
- final invoicing/accounting treatment of Partner value, CINSTE fee, refunds,
  commissions, and any payout;
- final legal classification and wording of CINSTE's platform role;
- exact payment-provider marketplace/connected-account structure, merchant of
  record responsibilities, KYC/AML allocation, webhook authority, payout
  timing, settlement, disputes, and refunds;
- exact VAT consequences if transaction structure, thresholds, or services
  change;
- consumer withdrawal, cancellation, refund, and complaint wording;
- final canonical domain and public support email.

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

## Work that can proceed safely now

Without publishing legal copy or moving money, CINSTE can complete:

- an internal legal/data inventory mapped to web, mobile, Supabase, analytics,
  Impact, Partner, Organization, Admin, and Giver flows;
- a policy requirements matrix for Terms, Privacy, Cookies/analytics,
  complaints, refunds, Impact safety, Organization/Partner data use, and Giver
  disclosures, with unresolved legal questions marked;
- a consent and disclosure matrix covering whole-platform 18+ eligibility,
  signup policy versions, Impact email consent, and Organization-specific
  access expiry;
- a route and release checklist that keeps the canonical domain and support
  address as required inputs;
- a payment-state and responsibility specification for funded → allocated/
  claimed → redeemed → payout eligible, without implementing payment authority;
- an accountant/legal/provider question register and evidence checklist.

Do not implement public legal pages, final Terms/Privacy text, invoice logic,
real payments, refunds, account deletion, or broad legal consent persistence
until the relevant professional confirmations and security review are complete.

## Current blockers

Milestone 0 is partially resolved. The release-blocking external decisions are:

1. final canonical CINSTE domain and support email;
2. accountant confirmation of the CAEN Rev.3 scope beyond current `6210`, if
   required by the actual platform/payment/campaign activities;
3. accounting and invoicing treatment of Partner value versus CINSTE fee;
4. Romanian legal confirmation of CINSTE's classification and contracting
   language;
5. payment-provider confirmation of the marketplace/connected-account model,
   settlement, KYC/AML, payout, dispute, and refund responsibilities;
6. tax/VAT confirmation for the intended transaction structure;
7. Romanian consumer-law confirmation of withdrawal, cancellation, refund, and
   complaint wording;
8. security review for real payment authority, webhooks, refunds, deletion, and
   retention changes.

The PFA identity and current non-VAT status are now owner-provided planning
facts. They are not a substitute for official evidence or professional advice.

## Next bounded milestone

**Milestone 1A — Internal legal/data and payment responsibility specification
(complete).**

The completed matrix is `docs/current/legal-data-payment-responsibility-matrix.md`.
It maps current role journeys, data classes, notices, consent, retention,
responsibility boundaries, the funded → redeemed → payout-eligible state
contract, and refund root-cause questions without implementing runtime behavior.

**Milestone 1B — professional confirmation packet (complete).** The packet is
`docs/current/legal-professional-confirmation-packet.md`. It packages the
confirmed owner inputs, repository boundaries, accountant/CAEN questions,
Romanian legal and consumer questions, privacy/DSA questions, payment-provider
questions, required review outputs, and release gates.

The next step requires external review of that packet. Public legal copy, real
payments, invoice logic, deletion, and refund execution remain blocked until
the relevant answers and security reviews are complete.

## Safe implementation boundary

Until Milestone 0 is approved, only internal planning, inventory, tests, and
non-public scaffolding are permitted. Do not expose placeholder legal pages,
invent provider identity, or enable real payments.
