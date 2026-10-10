# CINSTE Legal, Data, and Payment Responsibility Matrix

Status: internal, non-public planning artifact. This is not legal advice,
legal copy, a privacy notice, a payment specification, or evidence of
compliance.

Prepared from the repository state and owner inputs reconciled on 2026-10-10.
The matrix records implementation facts and open questions. It does not turn
the intended platform/facilitator model into a legal classification.

## Reading rules

- `Implemented` means visible in the current repository or recorded in an
  owner-confirmed migration/validation record.
- `Target` means an approved product direction that is not fully implemented.
- `External confirmation` means accountant, Romanian legal counsel, privacy
  counsel, or payment-provider input is required.
- No row authorizes public legal text, real payment movement, invoice issuance,
  refund execution, account deletion, or new data disclosure.

## Role and journey matrix

| Journey / surface | Current repository fact | Data involved | Intended responsible party | Notice, consent, and retention work | Status |
| --- | --- | --- | --- | --- | --- |
| Public discovery and acquisition | Web landing, onboarding, role-aware login, offer and Impact discovery surfaces exist. | Locale, page/event analytics, offer/opportunity identifiers, device/request metadata where captured. | CINSTE platform operation. | Cookie/analytics notice, lawful-basis and retention decision, public provider identity, support route. | Target legal work |
| Student signup and authentication | Web signup uses Auth actions. Native Student registration uses Supabase Auth. No Terms/Privacy acknowledgement is recorded. | Email, password handled by Auth, display/full name, profile and student-profile data. | CINSTE account platform. | Terms and Privacy version acknowledgement before account creation; separate optional marketing consent if used; 18+ assertion/verification policy. | Target; 18+ whole-platform rule not implemented |
| Giver signup and authentication | Web Giver signup and native Giver BFF signup exist. BFF uses strict server-side payload and stored-role checks. | Email, password handled by Auth, display name, profile, rate-limit security data. | CINSTE account platform. | Terms/Privacy acknowledgement; Giver payment/outcome disclosures; retention and deletion policy. | Target legal work |
| Student verification | Student verification and Admin document review exist. Documents are stored in private verification paths and Admin review is server-authoritative. | Verification document, name, faculty, university, status, reviewer, rejection reason, timestamps. | CINSTE verifies eligibility; student provides evidence. | Privacy notice must state purpose, access, retention/deletion exception, processor/storage role, and review rights. | Implemented technically; legal notice missing |
| Core claim and redemption | Verified Students claim; Partner-authoritative redemption uses server RPCs and QR/manual flow. | Student/claim IDs, redemption token hashes/secrets, offer/campaign, Partner/operator, timestamps, outcome analytics. | CINSTE operates allocation/claim infrastructure; Partner fulfils and redeems the experience. | Terms must distinguish CINSTE platform service from Partner fulfilment; retention, disputes, incident and fraud handling required. | Implemented technically; legal classification unresolved |
| Giver funding and mock checkout | Web checkout uses `create_mock_checkout` and `confirm_mock_payment`; payment provider is mock-only. | Giver order, item, offer, quantity, total, mock payment status/reference, paid timestamp, campaign allocation. | CINSTE owns current mock flow only. Future responsibility depends on provider and legal model. | Checkout disclosures, price/fee breakdown, acceptance record, receipt/invoice model, refund/complaint route. | Mock only; real payments blocked |
| Impact discovery and participation | Native Student Impact discovery, join, cancel, history, Organization resolution, Admin review, incidents, and audit/provenance exist across migrations `0011`–`0037`. | Student ID/display name projection, eligibility, opportunity, participation state, attendance/completion, audit, incidents, no-show restrictions. | CINSTE provides infrastructure/moderation; Organization operates activity and records attendance/completion. | Impact safety notice, participation terms, incident reporting, privacy projection, retention and access expiry. | Product direction implemented; legal surfaces missing |
| Impact contact disclosure | Email-only, explicit per-opportunity consent, activity-window expiry, phone rejected, assignment-scoped Organization access. | Student display name, participant ID, 18+ eligibility, email only when consented, expiry and audit. | Student chooses disclosure; CINSTE enforces; Organization uses only for the assigned opportunity. | Pre-join disclosure text, consent version/audit, Organization data-use obligation, expiry and post-activity access reduction. | Technically implemented; notice missing |
| Organization operations | Web Organization workspace and Impact actions are assignment-scoped. Admin controls approval/moderation. | Organization identity, operator assignment, opportunity details, coordinator/contact, participant projection, attendance/completion, incidents. | Organization operates the actual Impact activity; CINSTE moderates and provides infrastructure. | Organization terms, safety obligations, data-use limits, incident escalation, retention and post-activity access. | Partially implemented; final legal terms missing |
| Partner operations | Partner web redemption and offer draft operations exist; assigned Partner controls are server-authoritative. | Partner identity, offer/draft, redemption event, operator ID, campaign/claim data, payout-relevant future data. | Partner fulfils the underlying experience; CINSTE operates the platform. | Partner agreement, fulfilment, availability, redemption, complaint, settlement and data-use terms. | Partially implemented; payout model unresolved |
| Admin operations | Admin web foundation supports verification, Impact moderation, incidents/review, catalog and operational actions. | Review documents, moderation/risk, incidents, disputes, corrections, audit, internal notes. | CINSTE/Admin operational control plane. | Privileged-access policy, staff confidentiality, audit retention, incident and DSAR procedures. | Implemented foundation; operational policy missing |
| Account, privacy, and support | Account surfaces support language/workspace/logout. No deletion, export, rectification, restriction, legal, support, or complaint workflow exists. | All account/profile/transaction/verification/Impact records and audit history. | CINSTE must provide the request intake and controlled review. | GDPR rights process, identity verification, exceptions for immutable/audit/security records, response SLAs and support contact. | Not implemented; deletion requires security review |

## Data inventory and handling questions

| Data class | Repository evidence | Default access boundary | Required decision before public release |
| --- | --- | --- | --- |
| Identity and account | `profiles`, Auth users, role, display name, email. | Self, server-authorized role operations, Admin where required. | Privacy notice purpose, retention, deletion behavior, account recovery and provider processing. |
| Student eligibility | `student_profiles`, 18+ Impact flag, verification status, university/faculty. | Student and Admin; Organizations receive only approved eligibility label for an assigned opportunity. | Whole-platform 18+ enforcement design, legal basis, verification retention and age-evidence treatment. |
| Verification evidence | `student_verifications` and private document route. | Student/Admin; never Organization or Partner. | Document retention period, access log, deletion exception, processor/subprocessor and incident response. |
| Commercial records | `giver_orders`, order items, campaigns, `payments`, claims, redemption events. | Owner-scoped user, assigned Partner, Admin, server RPCs according to object. | Accounting record retention, invoice/receipt ownership, refund/chargeback authority, tax/VAT treatment. |
| Impact records | Opportunities, participations, attendance/completion, contributions, reciprocity state, incidents, audit events. | Student, assigned Organization projection, Admin; no broad Student CRM access. | Impact safety notice, incident retention, historical contribution immutability, dispute/correction procedure. |
| Contact disclosure | Consent and time-limited email access in migration `0037`; phone deferred. | Opportunity-specific assigned Organization only during the permitted window. | Exact pre-join wording, consent version, withdrawal/expiry behavior, post-activity access reduction and audit retention. |
| Analytics and locale | `analytics_events` and `cinste_web_locale` cookie. | Platform analytics/admin as implemented. | Cookie classification, consent requirement, lawful basis, vendor/processor list, retention, opt-out and deletion handling. |
| Internal risk and abuse notes | Impact no-show restrictions, moderation, incident and audit records. | CINSTE/Admin; Organization receives operational status only. | Privacy notice, access/review policy, retention, correction/dispute rights, staff access audit. |

## Payment state and responsibility matrix

This is a product/operations contract for later review. It is not a payment
provider or accounting design.

| State | Current repository | Intended V1 meaning | Giver-facing responsibility | Partner economic treatment | Open confirmation |
| --- | --- | --- | --- | --- | --- |
| Funded | Mock order/payment can become `paid`; no real provider. | Giver payment is accepted and associated with an experience allocation. | CINSTE is the support entry point. | Do not treat funds as immediately payout-eligible. | Merchant of record, funds flow, invoice/VAT, provider structure. |
| Allocated / claimed | Campaign inventory and Student claims exist. | Funding is reserved for eligible Student experience use. | CINSTE handles allocation and platform errors. | Remains unsettled until the redemption trigger. | Whether allocation creates a legal delivery or refund event. |
| Redeemed | Claim status and Partner redemption event are server-authoritative. | Partner delivered the underlying experience. | Successful redemption is ordinarily non-refundable except approved dispute/incident/refund process. | Normal trigger for Partner payout eligibility. | Settlement timing, proof, disputes, chargebacks, tax/accounting treatment. |
| Unfulfilled / unused and eligible for refund | No refund lifecycle exists. | Return eligible value to the original payment method; no wallet/stored value. | CINSTE manages the Giver-facing flow. | Settlement is not paid or is adjusted/reversed as applicable. | Statutory rights, eligibility window, provider mechanics, Partner responsibility. |
| Partner-caused failure | No operational refund flow exists. | CINSTE manages the Giver-facing support/refund path; Partner economics are adjusted according to confirmed agreement. | CINSTE is the customer-facing interface. | Responsibility depends on confirmed Partner agreement/provider model. | Legal relationship, recourse, settlement reversal and evidence. |
| CINSTE/payment failure | No real payment/webhook lifecycle exists. | CINSTE owns platform errors such as duplicate charge or incorrect allocation. | CINSTE support/refund process. | No payout where value was not delivered. | Provider dispute/chargeback and accounting treatment. |

## Responsibility boundaries

| Area | CINSTE | Partner | Organization | External confirmation |
| --- | --- | --- | --- | --- |
| Platform | Account, discovery, funding orchestration, allocation, claims, redemption records, reporting, Impact infrastructure. | Uses assigned tools. | Uses assigned Impact tools. | Final contractual wording and liability allocation. |
| Underlying experience | Does not intend to provide the Partner's product/service. | Provides the real-world product/service and valid redemption. | Not involved unless separately approved. | Whether the intended model is legally treated as facilitation/intermediation or another role. |
| Impact activity | Moderates, authorizes access, protects data, records platform audit, supports incidents. | Not an Impact publisher unless separately assigned/approved. | Operates activity, participant safety, attendance and completion. | Organization duties, insurance/safety, volunteer status, incident escalation. |
| Payments | Intended service/platform fee and Giver-facing support/refund interface. | Intended economic value and future payout eligibility. | No Impact payout. | Merchant of record, VAT, invoice, marketplace payment, KYC/AML, payout and refunds. |
| Privacy | Platform controller/operator responsibilities to be confirmed and documented. | Receives only minimum assigned participant data. | Receives only minimum assigned participant data. | Controller/processor/joint-controller roles, DPAs, subprocessors and retention. |

## External question register

These questions remain release gates:

1. Does current CAEN Rev.3 `6210` cover the platform, facilitation,
   Partner-offer, payment-orchestration, reporting, and future campaign
   activities? If not, which activities must be added before public commercial
   operation? No codes are guessed here.
2. Who is the legal seller, merchant of record, payment service beneficiary,
   and invoice issuer for each Giver payment component?
3. How should Partner experience value and the CINSTE platform fee be recorded,
   invoiced, taxed, refunded, and reported while the PFA is not VAT-registered?
4. Which provider-managed marketplace structure supports connected accounts,
   KYC/AML, settlement after redemption, refunds, disputes, chargebacks, and
   webhook authority without an ad-hoc CINSTE wallet or custody system?
5. What legal wording accurately describes CINSTE's role and the separate
   Student–Partner fulfilment relationship?
6. What consumer withdrawal, cancellation, unused-funding, failed-fulfilment,
   successful-redemption, complaint, and dispute rules apply to this exact
   transaction structure?
7. What privacy roles, retention periods, data-rights exceptions, analytics
   consent rules, and Organization data-use terms apply to the current data
   flows?
8. What operational support address, canonical domain, and legal notice
   versioning/effective-date process will be used?

## Completion and next step

Milestone 1A is complete as an internal documentation milestone. The next
bounded milestone is **Milestone 1B — professional confirmation packet**:
convert the external question register and payment-state matrix into a concise
accountant, Romanian legal counsel, and payment-provider review packet. Public
legal copy, real payment implementation, invoice logic, deletion, and refund
execution remain out of scope until the relevant answers are returned and
security review gates are opened.
