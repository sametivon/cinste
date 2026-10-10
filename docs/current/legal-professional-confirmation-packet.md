# CINSTE Legal, Accounting, and Payment-Provider Confirmation Packet

Status: internal handoff packet. Prepared on 2026-10-10 from owner inputs and
the CINSTE repository. This packet is not legal advice, tax advice, accounting
advice, a payment-provider approval, or public legal copy.

## Review objective

Confirm the legal, accounting, tax, consumer, privacy, and payment structure
for the CINSTE pilot before CINSTE publishes legal documents or enables real
payments.

The reviewer should answer each question directly, identify assumptions, cite
the relevant authority or provider requirement where appropriate, and state
whether the answer is safe for pilot use, requires a control, or blocks launch.

## Confirmed owner inputs

- Pilot entity: **KARACA ABDULMECIT PERSOANĂ FIZICĂ AUTORIZATĂ**.
- CUI/CIF: **51422239**.
- Trade Register number: **F2025007656003**.
- EUID: **ROONRC.F2025007656003**.
- Registered professional address: **Bucureşti Sectorul 1, Bulevardul
  BUCUREŞTII NOI, Nr. 136, Etaj P, Ap. 5**.
- Current primary CAEN Rev.3 activity: **6210 Activităţi de realizare a
  soft-ului la comandă (software orientat client)**.
- Current VAT status: not registered for Romanian VAT, based on the owner’s
  ANAF VAT-registry check dated 2026-10-10.
- V1 platform age policy: 18+ for Students, Givers, Partner operators, and
  Organization operators.
- Canonical public domain and support email: not yet finalized.

## Intended product and commercial model

CINSTE intends to operate as the technology platform/facilitator layer. The
Partner provides the underlying real-world experience. CINSTE connects
Students, Givers, Partners, and Organizations for discovery, funding,
allocation, claims, redemption, reporting, and Impact participation.

Intended relationships:

- Student ↔ CINSTE: platform terms, account, eligibility, claims, redemption,
  reciprocity, Impact, conduct, and privacy.
- Giver ↔ CINSTE: funding and CINSTE platform/payment/outcome services.
- Partner ↔ CINSTE: Partner agreement; Partner provides the underlying
  product/service and valid redemption.
- Student ↔ Partner: underlying experience fulfilment by the Partner.
- Organization ↔ CINSTE: Organization terms and approved Impact operations.
- Student ↔ Organization: Organization operates the actual Impact activity and
  records attendance/completion.

Intended V1 economics:

- Giver pays configurable Partner experience value plus a CINSTE
  platform/service fee.
- No fixed fee percentage or amount is locked.
- CINSTE absorbs normal payment-processing cost from its own fee by default.
- Initial Partner commission is 0%.
- Partner payout should become eligible after successful redemption, not merely
  after payment.
- Eligible unfulfilled or unused funding should normally return to the original
  payment method; no CINSTE wallet or stored-value system is planned.
- Impact is financially separate: Students do not pay, Organizations do not
  pay to publish, and Impact has no monetary rewards or Organization payouts.

These are business directions. They are not intended legal classifications.

## Current repository boundaries

- Current funding is mock-only through `create_mock_checkout`,
  `confirm_mock_payment`, and `completeMockPayment`.
- No real provider, webhook lifecycle, connected-account flow, payout,
  invoice/receipt implementation, refund workflow, chargeback workflow, or
  reconciliation workflow exists.
- Impact V1 has Admin moderation, low-risk scope, 18+ eligibility,
  Organization-authoritative attendance/completion, incidents, audited
  corrections, privacy-limited participant projection, and email-only
  explicit time-limited contact consent.
- Whole-platform 18+ enforcement is an owner-approved target but is not yet
  implemented across every account flow.
- No public Terms, Privacy Policy, Cookie notice, refund policy, support page,
  complaint page, data-request workflow, or legal acknowledgement exists.
- Verification documents, profiles, orders, claims, redemption records,
  analytics, Impact participation, incidents, audit records, and
  Organization-specific contact disclosure are handled by the current system.

Detailed mapping is in
`docs/current/legal-data-payment-responsibility-matrix.md`.

## Accountant and CAEN questions

1. Is current CAEN Rev.3 `6210` sufficient for the intended pilot activities:
   platform operation, Partner-offer discovery, facilitation, funding
   orchestration, claim/redemption records, Impact coordination, and aggregate
   reporting?
2. If `6210` is insufficient, which exact additional CAEN Rev.3 activities are
   required, and before which milestone: public pilot, real payment, Partner
   onboarding, corporate campaign, or Impact operation?
3. Does the intended Giver fee represent software/platform revenue, a service
   fee, commission, agency income, or another treatment?
4. How should Partner experience value, CINSTE fee, 0% Partner commission,
   refunds, failed fulfilment, and any future payout be recorded and invoiced?
5. Who issues the invoice or receipt for each amount paid by the Giver?
6. What VAT treatment applies while the PFA is not VAT-registered? What changes
   if thresholds, services, cross-border activity, or transaction structure
   change?
7. Does redemption-triggered settlement change the revenue-recognition,
   invoicing, or tax treatment?
8. Are any withholding, reporting, consumer-document, or Partner settlement
   records required for the pilot?

## Romanian legal and consumer questions

1. What is the legally accurate role of CINSTE for the intended structure:
   platform, facilitator, intermediary, agent, marketplace operator, payment
   facilitator, or another classification?
2. Can the intended Student–CINSTE, Giver–CINSTE, Partner–CINSTE,
   Organization–CINSTE, and Student–Partner relationship map be used, and what
   qualifications or disclosures are required?
3. Who is responsible to the Giver when the Partner refuses valid redemption,
   becomes unavailable, or cannot fulfil the published experience?
4. What refund and complaint procedure is required for platform failure,
   duplicate charge, incorrect allocation, Partner-caused failure, unused
   funding, and successful redemption?
5. What withdrawal, cancellation, expiry, or refund rights apply to each
   transaction type? Do not assume a blanket 14-day rule.
6. What consumer disclosures must appear before payment, including price
   components, CINSTE fee, Partner identity, fulfilment responsibility, refund
   limitations, complaint route, and payment provider information?
7. What Romanian ANPC/SAL information and contact route must be published for
   this exact business model?
8. Does the Organization Impact model create any specific volunteer, safety,
   insurance, safeguarding, or incident-reporting obligations?
9. Does CINSTE qualify as an online platform under applicable DSA obligations
   for Organization-authored Impact opportunities and Partner-authored offer
   drafts? If yes, which terms, notice/action, statement-of-reasons, complaint,
   transparency, and contact controls are required for the pilot?
10. What privacy roles apply to CINSTE, Partners, Organizations, payment
    providers, analytics providers, and verification storage providers?
11. What retention periods and deletion exceptions apply to verification
    evidence, payment/accounting records, claims/redemptions, Impact incidents,
    audit history, analytics, and no-show/security records?
12. What identity and authentication controls are required for access,
    deletion, export, rectification, restriction, and objection requests?

## Payment-provider questions

1. Can the provider support a provider-managed connected-account or marketplace
   model where the Partner's economic share is not paid out before redemption?
2. Who is the merchant of record, payment recipient, and refund authority for
   the Partner value and CINSTE fee?
3. How are connected-account onboarding, KYC/AML, sanctions screening, tax
   reporting, negative balances, and account suspension handled?
4. Can the provider support separate configurable line items without exposing a
   separate payment-processing fee by default?
5. Can the provider support full refund to the original payment method for
   eligible unfulfilled/unused funding, including reversal of the CINSTE fee
   where the confirmed policy requires it?
6. What is the exact webhook and idempotency contract for payment, allocation,
   redemption, refund, dispute, chargeback, payout, and account events?
7. Can payout eligibility be triggered only by a server-authoritative successful
   redemption event?
8. What provider records, reconciliation reports, receipt data, and retention
   controls are required?
9. Does the provider permit the PFA and intended Romanian activity scope, and
   what domain, business identity, and terms are required before activation?
10. What happens when a Partner refuses redemption, is unavailable, or has a
    negative balance after a refund or chargeback?

## Required review outputs

The review is complete only when the project has written answers or explicit
open blockers for:

- CAEN scope and required timing;
- contracting and legal classification;
- invoice/receipt and Partner-value accounting treatment;
- VAT and tax treatment;
- consumer disclosures and refund/withdrawal rules;
- privacy roles, retention, and data-rights handling;
- DSA/ANPC/SAL applicability and required notices;
- provider structure, merchant-of-record role, KYC/AML, payout, webhook,
  dispute, and refund controls;
- canonical domain and support identity;
- security-review scope for payment authority, refunds, deletion, and retention.

Each answer should include: reviewer, organization, date, scope, assumptions,
source or rationale, required product control, and whether it is a launch
blocker.

## Release gate

Until these outputs are approved, CINSTE must keep the following unchanged:

- no public final Terms, Privacy Policy, Cookie notice, refund policy, or
  provider disclosure;
- no real payment provider or payout activation;
- no invoice or refund execution logic;
- no wallet, stored-value, custody, or manual Partner-money redistribution;
- no broad legal-consent persistence added only to create an appearance of
  compliance;
- no invented domain, support email, CAEN code, VAT statement, or legal role.
