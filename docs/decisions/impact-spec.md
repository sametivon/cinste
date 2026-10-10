---
tur: adr
durum: kabul
tarih: 2026-10-02
---
# docs/decisions/impact-spec.md

> Historical decision record. Superseded for the current Impact V1 target by
> [`impact-v1-operating-model.md`](impact-v1-operating-model.md) dated
> 2026-10-10. In particular, the fixed 3:1 reciprocity rule, direct
> Organization publication, and the earlier opportunity/moderation model are
> no longer current. This file is retained for decision traceability; do not
> use conflicting sections as implementation authority.

# CINSTE Impact — Product Spec V1

## Vision

> People give students experiences, and students turn that generosity into community impact.

CINSTE Impact is not a separate app.

It extends the existing CINSTE student experience with a reciprocity system and verified community contribution.

## V1 actors
- Verified Student
- Verified Organization
- Organization Operator
- Admin

V1 does not include peer-to-peer student requests.

## Platform boundary
Student Impact experience:
- native mobile

Organization operations:
- responsive web portal for opportunity authoring, lifecycle management,
  broader queues, and history
- native mobile capability for relevant daily operations such as action queues,
  participant completion/outcome handling, organization context, and timely
  status work

Admin:
- web-first operational control plane

These surfaces share the existing assignment, RLS, RPC, and audit authority.
Native Organization capability does not create a new role or permit broader
access than an active `organization_users` assignment. No native Admin surface
is approved without a later concrete operational need.

## Reciprocity model

Community participation follows a 3:1 cycle.

A verified student may successfully redeem:

3 Community CINSTE

Then the student enters:

`GIVE_BACK_DUE`

Before claiming another Community CINSTE, the student must complete one eligible verified contribution.

Only successful redemptions count.

The following do not count:
- expired claims
- cancelled claims
- unused claims

After an eligible contribution is verified while the student is due:
- cycle resets to 0
- state returns to OPEN

## No contribution banking
A contribution completed before `GIVE_BACK_DUE`:
- counts toward Impact Profile
- does not prepay or reset a future reciprocity cycle

A contribution may settle a current due cycle only when its trusted completion
provenance is at or after that cycle's `due_at`. Verification after `due_at`
does not make an earlier completion eligible to settle the debt.

One verified contribution may settle only one current reciprocity cycle.

No contribution-credit banking.

## Campaign reciprocity types

Campaigns may be:

### COMMUNITY
Normal/default CINSTE.
Counts toward the 3:1 reciprocity cycle.

### OPEN
Social-support/public-interest exception.

Open CINSTE:
- remains claimable while `GIVE_BACK_DUE`
- does not increment the cycle
- does not reset the cycle
- does not require contribution

Only authorized CINSTE administration should control Open vs Community classification.

Existing campaigns default to `COMMUNITY`. `OPEN` is an explicit,
Admin-controlled exception.

The campaign classification is frozen as soon as the campaign has any claim.
Claims are counted using the classification effective at redemption; later
classification changes cannot reinterpret existing claims.

## Organization access and onboarding

Organization onboarding is Admin/CINSTE-controlled in V1. There is no public
self-service organization onboarding.

The same auth account may be both a verified student and an assigned
organization operator. Product surfaces remain separate. The same user must
never be able to verify their own contribution.

## Existing users
Impact launch must not create retroactive contribution debt.

Existing students begin the reciprocity program with a fresh cycle.

Historical redemptions remain historical analytics only.

Reciprocity enforcement begins only after an explicit, one-time server-admin
policy activation. There is no historical redemption backfill and activation
does not reset live reciprocity state. A pre-activation active Community claim
redeemed after activation counts at redemption.

## Student reciprocity states

Conceptually:

### OPEN
Community CINSTE may be claimed.

### APPROACHING_DUE
Informational state before the third redemption.
May be computed rather than stored.

### GIVE_BACK_DUE
New Community CINSTE claims are blocked until an eligible verified contribution settles the current cycle.

Open CINSTE remains available.

## Impact supply safeguard
Students must not be blocked because CINSTE has failed to provide a reasonable Impact opportunity.

If:
- student is `GIVE_BACK_DUE`
- no eligible Impact opportunity is reasonably available

then Community enforcement may be temporarily waived.

The student remains conceptually due.

Additional redemptions during this supply waiver must not create multiple contribution debts.

When eligible supply returns, one verified contribution settles the due state.

The supply exception is evaluated afresh on each Community claim and is never
stored as a blanket entitlement. The allowed claim is audited with the cycle,
policy version, evaluation time, and supply-failure reason.

For V1, reasonable supply exists when at least one active, published opportunity
with capacity is reasonably available within the next 14 days. V1 considers
remote opportunities and opportunities in Bucharest. User-caused restrictions,
including active participation limits, cooldowns, or personal schedule overlap,
do not count as platform supply failure.

Scheduled supply requires a future start within 14 days and canonical
Bucharest location. A joinable flexible/remote opportunity with a future
deadline is supply even when its deadline is beyond 14 days. An opportunity
where the student has already earned the lifetime contribution is not supply
for that student.

## Impact Opportunities

V1 supports organization-created opportunities.

Conceptual categories:
- Community
- Education
- Environment
- Animals
- Events
- Skills
- Other

Opportunity may be:
- scheduled
- flexible/remote

Flexible/remote opportunities may be cancelled normally before `due_at`. They
have no late-cancellation or no-show semantics. If incomplete after `due_at`,
the participation becomes `expired_incomplete`.

Student may:
- browse
- inspect
- join
- cancel where allowed
- see status/history

Maximum:
- 2 active Impact participations per student

Scheduled time overlap should be prevented.

No waitlist in V1.
No recurrence engine in V1.

## Organization lifecycle
Conceptually:
- pending review
- active
- suspended/deactivated

Only approved/active organizations may publish new opportunities.

Deactivation:
- stops new joins
- safely suspends/cancels relevant active/upcoming opportunities
- creates no student no-show penalty
- does not delete historical verified contributions

Reactivation must not resurrect old cancelled opportunities automatically.

## Participation lifecycle
Conceptual states may include:
- joined
- cancelled
- cancelled_by_organization
- late_cancelled
- completed
- no_show
- excused
- expired_incomplete
- disputed

Exact technical state model should remain minimal.

## Cancellation policy
For scheduled opportunities:

At least 4 hours before start:
- normal cancellation
- no penalty

Less than 4 hours:
- late cancellation

No attendance:
- no-show

## No-show policy
Rolling 90 days:

First no-show:
- warning

Second:
- 48-hour Impact join cooldown

Third:
- 7-day Impact join cooldown
- admin review flag

Open CINSTE remains available.

No-show does not erase historical verified contributions.

Student may dispute a no-show.

## Verified Contribution
Student cannot self-verify.

The organization responsible for the opportunity confirms completion.

A verified contribution records real metrics such as:
- verified contribution count
- verified minutes
- organization helped

No generic Impact points.
No monetary conversion.
No CINSTE-credit economy.
No public leaderboard.

## Duration
Opportunity defines expected eligible duration.

Organization should not freely inflate duration at completion.

V1 has no partial contribution credit.

Either the contribution is completed and eligible, or it is not.

## Reciprocity settlement
Only a verified eligible contribution completed while the student is `GIVE_BACK_DUE` settles the current reciprocity cycle.

The following do not unlock Community CINSTE:
- joining
- starting
- awaiting verification

Only verified completion settles the cycle.

## Verification timing
Organization should normally resolve participation within 72 hours after the relevant opportunity ends.

If unresolved:
- participation becomes overdue
- student may request admin review

Do not auto-verify solely because the organization failed to respond.

## Admin authority
Admin may:
- approve/deactivate organizations
- hide/deactivate opportunities
- inspect Impact operations
- resolve disputes
- verify/revoke contributions where justified
- waive the current reciprocity requirement for exceptional/support cases

Material overrides require:
- reason
- timestamp
- audit trail

Revoking an old contribution must not retroactively reconstruct old reciprocity cycles.

Fraud may instead trigger administrative action.

## Organization cancellation
If organization cancels:
- participation outcome is `cancelled_by_organization`
- student receives no penalty
- no contribution is created
- due state remains due if already due

`excused` remains a separate student-specific outcome.

## Verification status changes
If a verified student later becomes pending/unverified:
- no new Impact joins
- no new Community claims
- historical Impact remains visible
- existing participation should not be destructively erased
- an existing joined participation may still complete and be verified

## Claim interaction
Reciprocity does not replace the existing rolling 24-hour claim rule.

A Community claim may require:
- verified student
- campaign eligibility
- inventory
- reciprocity eligibility
- rolling 24-hour eligibility

Open CINSTE bypasses reciprocity only, not unrelated claim rules.

## Existing active claims
If a valid Community claim already exists and the student later becomes due, do not invalidate that already-valid claim solely because reciprocity state changed.

Gate new claims.

## Opportunity slots
Capacity must be enforced atomically.

Cancellation may restore a future slot where appropriate.

No waitlist in V1.

## Disputes
Student may dispute no-show or participation outcome.

Admin resolves disputes.

Do not let organization silently overwrite a disputed outcome without audit.

## Privacy
Organization must not receive:
- verification documents
- full CINSTE transaction history
- unrelated contribution history
- unnecessary contact information

Organization sees only operationally necessary data for its own opportunities.

Future sponsor/brand reporting must be aggregate and must not expose individual student Impact identity.

## Impact Profile
Student Impact Profile should use real measurements, such as:
- verified contributions
- verified minutes/hours
- unique organizations helped

Avoid point systems and artificial currency.

## Mobile concept
Future student navigation:

- Discover
- My CINSTE
- Impact
- Profile

Impact is visible only to verified students.

Post-redemption may show an optional entry point such as:

"Someone made your day. Want to pass something forward?"

Actions:
- Explore Impact
- Not now

This CTA does not itself settle reciprocity.

## Out of scope for V1
Do not implement:
- peer-to-peer student requests
- direct messaging
- Skill Wallet
- Impact Chain UI
- public social feed
- followers
- likes/comments
- university circles
- CSR sponsor dashboard
- automatic Impact PDF reports
- public leaderboard
- Impact points
- monetary Impact rewards
- contribution banking
- peer verification
- advanced recommendation engine
- waitlists
- recurrence engine

Architecture should avoid unnecessarily blocking future extensions, but must not implement them now.
