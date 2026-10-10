---
tur: adr
durum: kabul
tarih: 2026-10-10
supersedes: docs/decisions/impact-spec.md
---
# CINSTE Impact V1 Operating Model

This decision record is the current product authority for CINSTE Impact V1.
It supersedes the fixed reciprocity and direct-publication rules in
`docs/decisions/impact-spec.md`. That document remains as historical decision
traceability and must not be treated as the current target model where this
record differs.

## Purpose and language

CINSTE Impact is the reciprocity layer of CINSTE:

> Someone gives → Student experiences → Student gives back → Community benefits → Cycle continues

Impact is not a generic volunteering marketplace, peer-to-peer help system,
person-to-person request system, debt, repayment, or a monetary obligation.
Students contribute time, effort, or skills through verified community
opportunities.

Use language such as `give back`, `complete your cycle`, `create impact`, and
`your contribution`. Do not describe a student as owing or repaying CINSTE.

## Reciprocity policy

The reciprocity ratio is a configurable product policy, not a permanent domain
rule. The initial pilot may use three funded experiences followed by one Impact
contribution as the default configuration.

Changing the policy must not redesign the domain model or destroy historical
contributions. Historical contributions remain intact and retain their
original provenance and applicable policy context.

The ratio and enforcement policy must remain changeable by authorized CINSTE
administration. Product copy must remain compatible with policy changes and
must not use debt or repayment language.

## Actors and authority

Only verified, Admin-approved Organizations may submit Impact opportunities.
For V1, verified means manual CINSTE/Admin review, active organization status,
and basic organization identity evidence sufficient for that review. V1 does
not include a heavy external due-diligence system.

Students, Givers, Partners, public users, and arbitrary peer requests cannot
create opportunities.

Organization operations require an active `organization_users` assignment and
remain scoped to that Organization. Impact extends CINSTE; it is not a
separate application.

## Moderation and publication

Organizations must not publish directly. The lifecycle is:

`draft → submitted_for_review → pending_review → approved or rejected → published`

Every opportunity requires CINSTE review before publication. Review considers:

- category and actual activity
- location or remote suitability
- coordinator
- age and participant requirements
- unusual risk
- prohibited activity
- suspicious or inappropriate requests

Rejected opportunities remain non-publishable unless they are resubmitted and
reviewed again. Organization cancellation and Admin suspension must not impose
a student penalty.

## V1 risk model and scope

V1 uses a simple internal risk distinction:

- `allowed_low_risk`
- `restricted_not_publishable`

Only low-risk opportunities may be published. This is not a numeric scoring
system.

Allowed areas include structured environment and park cleanups, planting,
NGO operations, donation or food-bank sorting, warehouse/package preparation,
community event support, registration/setup/attendee guidance, digital
volunteering, translation, copywriting, simple design, social-media support,
simple technical support, data cleanup, research, resource mapping, community
surveys, and clothes/books/supplies collection and organization.

Remote opportunities are limited to suitable digital or skills work. Flexible
scheduling is allowed for remote/digital work, not for loosely supervised
flexible physical activities.

V1 prohibits elderly home visits, personal in-home assistance, childcare,
unsupervised work with minors, medication or medical assistance, personal care,
washing or lifting vulnerable beneficiaries, driving beneficiaries,
construction, electrical or repair work, emergency or disaster response,
handling beneficiary money/cards/financial accounts, crisis or mental-health
intervention, and arbitrary person-to-person help requests. Reconsidering
these areas requires a later separate safety model.

## Rollout

V1 is Bucharest-first, manually controlled, low-risk only, and limited to
students aged 18 or older. The pilot target is approximately 35 Organizations
and 10–20 active opportunities. These are operational targets, not hard-coded
database limits.

## Opportunity model

An opportunity must support structured information for:

- title and category
- short description
- what students will do
- date/time
- location or remote mode
- estimated duration
- capacity
- requirements
- what the Organization provides
- coordinator/contact
- accessibility information
- participant contact-data requirements
- internal moderation and risk state

Student-facing pages should remain simple and readable. Organization and Admin
surfaces may use more structured operational data.

V1 completion is Organization-authoritative. Do not add a configurable
completion-method field unless the existing architecture later proves it is
required.

## Student experience

Students can discover published opportunities, view details, join, cancel when
allowed, view upcoming participation, and view completed Impact history.

Students cannot authoritatively self-report completion. Attendance and
completion are separate concepts: a student may attend without receiving a
completed contribution.

Impact history may show completed activities, total Impact hours, categories,
and recent contributions. V1 excludes points, leaderboards, monetary rewards,
and heavy gamification.

## Attendance, completion, and commitment

Organization operators authoritatively record attendance and completion.
V1 needs only simple operational recording. It does not include GPS, QR,
check-in/check-out infrastructure, or attendance-device workflows.

The model must distinguish at least:

- joined
- cancelled
- no-show
- attended
- completed
- excused where relevant

Authoritative Organization/Admin actions retain audit and provenance. Verified
completion continues to feed student Impact history and the configured
reciprocity policy. Existing `impact_contributions` remains the preferred
completion foundation unless a later approved decision requires otherwise.

Joining represents a real commitment. The V1 normal cancellation deadline is
12 hours before a scheduled activity. Within a rolling 90-day period, the
first no-show produces a warning, the second creates a 48-hour Impact joining
restriction, and the third creates a 7-day Impact joining restriction.
These controls protect limited community capacity and must not be framed as
punishment. Organization cancellation or Organization-caused failure never
penalizes the student.

## Participant access and privacy

Organizations may operate participant lists only for their own opportunities.
They may see who joined, cancelled, attended, completed, or was excused/no-show
where relevant. They cannot browse Students as a CRM.

The default participant projection contains only:

- first name plus last-name initial, such as `Ana P.`
- CINSTE participant identifier
- required eligibility, such as `18+ verified`
- participation, attendance, and completion status

CINSTE retains the full Student profile. Organizations do not receive
verification documents, full date of birth, home address, funded-experience
history, full Impact history, reciprocity state, unrelated Organization
activity, payment information, claims, or internal risk/no-show/abuse notes
beyond the minimum needed for their own opportunity.

Email and phone are not shared by default. An opportunity may request a field
from a controlled CINSTE-approved contact set only when genuinely required.
The Student must see that requirement before joining. Disclosure is
opportunity-specific and access reduces after the activity to the minimum
operational/history record required. Arbitrary free-form personal-data requests
and persistent Student CRM access are prohibited.

## Incidents

Both Students and Organization operators may report an incident related to a
participation. V1 categories include safety concern, harassment, inappropriate
behavior, injury, Organization issue, Student issue, and other.

V1 severity is `low`, `medium`, or `serious`. V1 lifecycle is `open`,
`reviewing`, `resolved`, or `dismissed`. Admin has an incident-review queue.
This is a simple operational model, not enterprise case management.

## Giver connection and monetization

Impact may connect to Giver outcomes through privacy-preserving aggregates:
completed Impact activities, total community Impact hours, and participating
Students. No one-to-one Giver/Student Impact attribution is permitted.

Giver aggregate Impact detail requires at least five participating Students,
while stronger existing privacy protections remain in force.

Organizations do not pay to publish in V1. Impact is a reciprocity,
differentiation, retention, and network-effect layer, not the primary direct
monetization product. Corporate programs and commercial aggregate reporting
are later scope.

## Conceptual model and platform boundaries

The conceptual model remains:

`Organization → Impact Opportunity → Participation → Attendance / Completion`

plus `Impact Incident`.

Student Impact belongs in native mobile, Organization operations primarily in
the web portal, and Admin in the web-first control plane. Organization access
is assignment-scoped. Capacity and lifecycle changes remain transactional.
Historical contributions are not destructively removed; corrections and
revocations remain audited; disputes and Admin review remain supported.

Peer requests, messaging, social feeds, points, leaderboards, waitlists,
recurrence, monetary Impact rewards, and peer verification remain out of V1.
Historical migrations remain immutable.
