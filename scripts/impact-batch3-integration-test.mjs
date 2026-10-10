import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact integration tests refuse NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `Impact Batch 3 QA ${new Date().toISOString().replace(/[:.]/g, '-')}`;
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions += 1; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); assertions += 1; };
async function must(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; }
async function auth(email) {
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email, password: 'cinste-local-2026' });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return db;
}
async function user(label, role = 'student') {
  const email = `qa.impact.batch3.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, user_metadata: { cinste_test_data: true }, app_metadata: { cinste_test_data: true } });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message ?? 'unknown error'}`);
  await must(service.from('profiles').upsert({ id: data.user.id, email, display_name: `${run} ${label}`, role }, { onConflict: 'id' }), 'QA profile');
  const university = await must(service.from('universities').select('id').limit(1).single(), 'QA university');
  await must(service.from('student_profiles').upsert({ user_id: data.user.id, full_name: `${run} ${label}`, university_id: university.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'QA student profile');
  return { id: data.user.id, email, db: await auth(email) };
}
async function rpc(db, name, args, label) { return must(db.rpc(name, args), label); }
async function errorOf(query) { return (await query).error; }
async function expectFailure(query, text, label) { const error = await errorOf(query); check(Boolean(error), `${label} rejects`); if (text) check(error.message.includes(text), `${label} reports ${text}`); }
async function createOpportunity(db, organizationId, values = {}) {
  const mode = values.mode ?? 'flexible_remote';
  const startsAt = values.startsAt ?? null;
  const endsAt = values.endsAt ?? null;
  const dueAt = values.dueAt ?? new Date(Date.now() + 86_400_000).toISOString();
  return rpc(db, 'organization_create_impact_opportunity', {
    p_organization_id: organizationId, p_title: `${run} opportunity`, p_description: 'Batch 3 QA opportunity', p_category: 'community', p_mode: mode,
    p_city: 'Bucharest', p_starts_at: startsAt, p_ends_at: endsAt, p_due_at: dueAt, p_expected_eligible_minutes: values.minutes ?? 60, p_capacity: values.capacity ?? 10,
  }, 'create opportunity');
}
async function publish(db, id) { await rpc(db, 'organization_submit_impact_opportunity', { p_opportunity_id: id }, 'submit opportunity'); return rpc(admin, 'admin_review_impact_opportunity', { p_opportunity_id: id, p_decision: 'approved', p_risk_state: 'allowed_low_risk', p_reason: 'Batch 3 QA approval' }, 'Admin approves opportunity'); }
async function join(db, id) { return rpc(db, 'student_join_impact_opportunity', { p_opportunity_id: id }, 'join opportunity'); }
async function futureSchedule() {
  const start = new Date(Date.now() + 7_200_000);
  const end = new Date(start.getTime() + 3_600_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString(), dueAt: end.toISOString() };
}

const admin = await auth('admin@cinste.test');
const { data: adminIdentity, error: adminIdentityError } = await admin.auth.getUser();
if (adminIdentityError || !adminIdentity.user) throw new Error(`Read admin identity: ${adminIdentityError?.message ?? 'unknown error'}`);
const adminUniversity = await must(service.from('universities').select('id').limit(1).single(), 'admin QA university');
await must(service.from('student_profiles').upsert({ user_id: adminIdentity.user.id, full_name: `${run} admin`, university_id: adminUniversity.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'admin QA student profile');
const probe = await admin.rpc('organization_verify_impact_participation', { p_participation_id: crypto.randomUUID() });
if (probe.error?.code === 'PGRST202' || probe.error?.message?.includes('Could not find the function')) {
  console.log(`SKIP: Impact Batch 3 migration is not applied. Apply 0013_impact_batch3_verified_contributions_reciprocity.sql before rerunning.`);
  process.exit(0);
}

const organizations = [];
try {
  const operator = await user('operator');
  const foreignOperator = await user('foreign-operator');
  const student = await user('student');
  const studentTwo = await user('student-two');
  const preDueStudent = await user('pre-due');
  const raceStudent = await user('race');
  const adminStudent = await user('admin-student', 'admin');

  const organizationA = await rpc(admin, 'admin_create_organization', { p_name: `${run} A`, p_city: 'Bucharest' }, 'create org A');
  const organizationB = await rpc(admin, 'admin_create_organization', { p_name: `${run} B`, p_city: 'Bucharest' }, 'create org B');
  organizations.push(organizationA, organizationB);
  for (const organizationId of organizations) await rpc(admin, 'admin_activate_organization', { p_organization_id: organizationId, p_reason: 'Batch 3 QA' }, 'activate org');
  await rpc(admin, 'admin_assign_organization_user', { p_organization_id: organizationA, p_user_id: operator.id }, 'assign operator');
  await rpc(admin, 'admin_assign_organization_user', { p_organization_id: organizationB, p_user_id: foreignOperator.id }, 'assign foreign operator');

  const opportunity = await createOpportunity(operator.db, organizationA, { minutes: 75 });
  await publish(operator.db, opportunity);
  const participation = await join(student.db, opportunity);

  const anonymous = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  await expectFailure(anonymous.rpc('organization_verify_impact_participation', { p_participation_id: participation }), null, 'anonymous verification');
  await expectFailure(foreignOperator.db.rpc('organization_verify_impact_participation', { p_participation_id: participation }), 'ORGANIZATION_ACCESS_REQUIRED', 'foreign organization verification');
  await expectFailure(operator.db.rpc('organization_verify_impact_participation', { p_participation_id: await join(operator.db, opportunity).catch(() => null) }), null, 'operator self verification setup');
  await expectFailure(student.db.rpc('organization_verify_impact_participation', { p_participation_id: participation }), 'ORGANIZATION_ACCESS_REQUIRED', 'student verification');

  const selfOpportunity = await createOpportunity(operator.db, organizationA); await publish(operator.db, selfOpportunity);
  const selfParticipation = await join(operator.db, selfOpportunity);
  await expectFailure(operator.db.rpc('organization_verify_impact_participation', { p_participation_id: selfParticipation }), 'SELF_VERIFICATION_FORBIDDEN', 'dual-role operator self verification');

  const completedOpportunity = await createOpportunity(operator.db, organizationA, { minutes: 75 }); await publish(operator.db, completedOpportunity);
  const completedParticipation = await join(student.db, completedOpportunity);
  const first = await rpc(operator.db, 'organization_verify_impact_participation', { p_participation_id: completedParticipation }, 'trusted verification');
  const second = await rpc(operator.db, 'organization_resolve_impact_participation', { p_participation_id: completedParticipation, p_outcome: 'completed', p_reason: null }, 'idempotent completion');
  const contribution = await must(student.db.from('impact_contributions').select('*').eq('id', first).single(), 'read contribution');
  eq(second, null, 'resolve wrapper returns void');
  eq(contribution.verified_minutes, 75, 'contribution uses exact opportunity minutes');
  eq(contribution.student_id, student.id, 'contribution identity is server derived');
  eq((await must(student.db.from('impact_contributions').select('id').eq('participation_id', completedParticipation), 'count duplicate contribution')).length, 1, 'duplicate verification creates one contribution');
  await expectFailure(student.db.from('impact_contributions').insert({ participation_id: completedParticipation, opportunity_id: completedOpportunity, student_id: student.id, organization_id: organizationA, verified_minutes: 1, verifier_id: student.id }), null, 'direct contribution insert');
  await expectFailure(student.db.from('impact_reciprocity_state').update({ status: 'open' }).eq('student_id', student.id), null, 'direct reciprocity write');
  await expectFailure(student.db.rpc('student_join_impact_opportunity', { p_opportunity_id: completedOpportunity }), 'OPPORTUNITY_CONTRIBUTION_ALREADY_EARNED', 'rejoin after earned contribution');

  await rpc(admin, 'admin_revoke_impact_contribution', { p_contribution_id: first, p_reason: 'Batch 3 revocation test' }, 'revoke contribution');
  await expectFailure(operator.db.rpc('organization_verify_impact_participation', { p_participation_id: completedParticipation }), 'CONTRIBUTION_REVOKED', 'revoked contribution is not recreated');
  eq((await must(student.db.from('impact_reciprocity_settlements').select('id').eq('contribution_id', first), 'read settlement history')).length, 0, 'profile contribution did not settle open state');

  const preDueOpportunity = await createOpportunity(operator.db, organizationA); await publish(operator.db, preDueOpportunity);
  const preDueParticipation = await join(preDueStudent.db, preDueOpportunity);
  const preDueContribution = await rpc(operator.db, 'organization_verify_impact_participation', { p_participation_id: preDueParticipation }, 'verify before due');
  await must(service.from('impact_reciprocity_state').upsert({ student_id: preDueStudent.id, cycle_number: 4, community_redemption_count: 3, status: 'give_back_due', cycle_started_at: new Date(Date.now() + 60_000).toISOString() }, { onConflict: 'student_id' }), 'set later due cycle');
  eq((await must(service.from('impact_reciprocity_settlements').select('id').eq('contribution_id', preDueContribution), 'pre-due settlement')).length, 0, 'pre-due contribution does not bank');

  const lossOpportunity = await createOpportunity(operator.db, organizationA); await publish(operator.db, lossOpportunity);
  const lossParticipation = await join(studentTwo.db, lossOpportunity);
  await must(service.from('student_profiles').update({ verification_status: 'pending' }).eq('user_id', studentTwo.id), 'remove current verification');
  await rpc(operator.db, 'organization_verify_impact_participation', { p_participation_id: lossParticipation }, 'verify after verification loss');
  await must(service.from('student_profiles').update({ verification_status: 'verified' }).eq('user_id', studentTwo.id), 'restore verification');

  const oldOutcome = await createOpportunity(operator.db, organizationA); await publish(operator.db, oldOutcome);
  const oldParticipation = await join(studentTwo.db, oldOutcome);
  await must(service.from('impact_participations').update({ status: 'completed', resolved_at: new Date().toISOString(), resolution_actor_id: studentTwo.id }).eq('id', oldParticipation), 'prepare preexisting completed row');
  const oldContribution = await rpc(operator.db, 'organization_verify_impact_participation', { p_participation_id: oldParticipation }, 'independently confirm preexisting completed row');
  check(Boolean(oldContribution), 'preexisting completed row receives contribution only after confirmation');

  const scheduled = await futureSchedule();
  const invalidOpportunity = await createOpportunity(operator.db, organizationA, { mode: 'scheduled', ...scheduled }); await publish(operator.db, invalidOpportunity);
  const invalidParticipation = await join(student.db, invalidOpportunity);
  await must(service.from('impact_opportunities').update({ starts_at: new Date(Date.now() - 7_200_000).toISOString(), ends_at: new Date(Date.now() - 3_600_000).toISOString(), due_at: new Date(Date.now() - 3_600_000).toISOString() }).eq('id', invalidOpportunity), 'prepare no-show opportunity');
  await rpc(operator.db, 'organization_resolve_impact_participation', { p_participation_id: invalidParticipation, p_outcome: 'no_show', p_reason: 'Batch 3 no-show' }, 'resolve no-show');
  await expectFailure(operator.db.rpc('organization_verify_impact_participation', { p_participation_id: invalidParticipation }), 'PARTICIPATION_NOT_VERIFIABLE', 'no-show verification');

  const raceOpportunity = await createOpportunity(operator.db, organizationA); await publish(operator.db, raceOpportunity);
  const raceParticipation = await join(raceStudent.db, raceOpportunity);
  const raceA = await auth(operator.email); const raceB = await auth(operator.email);
  const raceResults = await Promise.all([raceA.rpc('organization_verify_impact_participation', { p_participation_id: raceParticipation }), raceB.rpc('organization_verify_impact_participation', { p_participation_id: raceParticipation })]);
  eq(raceResults.filter((result) => !result.error).length, 2, 'duplicate verification race is idempotent');
  eq((await must(service.from('impact_contributions').select('id').eq('participation_id', raceParticipation), 'race contribution count')).length, 1, 'duplicate verification race records one contribution');

  // Keep the due transition safely before the server-side completion timestamp.
  // The Batch 4 no-banking rule intentionally rejects completion before due,
  // so using the client clock's exact "now" is vulnerable to clock skew.
  await must(service.from('impact_reciprocity_state').upsert({ student_id: raceStudent.id, cycle_number: 8, community_redemption_count: 3, status: 'give_back_due', cycle_started_at: new Date(Date.now() - 120_000).toISOString(), due_at: new Date(Date.now() - 60_000).toISOString() }, { onConflict: 'student_id' }), 'set due state');
  const settleOpportunity = await createOpportunity(operator.db, organizationA); await publish(operator.db, settleOpportunity);
  const settleParticipation = await join(raceStudent.db, settleOpportunity);
  await rpc(operator.db, 'organization_verify_impact_participation', { p_participation_id: settleParticipation }, 'settle current due cycle');
  const stateAfter = await must(service.from('impact_reciprocity_state').select('*').eq('student_id', raceStudent.id).single(), 'read settled state');
  eq(stateAfter.status, 'open', 'settlement returns state to open');
  eq(stateAfter.cycle_number, 9, 'settlement advances exactly one cycle');
  eq(stateAfter.community_redemption_count, 0, 'settlement resets redemption count');
  eq((await must(service.from('impact_reciprocity_settlements').select('id').eq('student_id', raceStudent.id).eq('cycle_number', 8), 'read current settlement')).length, 1, 'current cycle has one settlement');

  await must(service.from('impact_reciprocity_state').upsert({ student_id: student.id, cycle_number: 12, community_redemption_count: 3, status: 'give_back_due', cycle_started_at: new Date(Date.now() - 120_000).toISOString(), due_at: new Date(Date.now() - 60_000).toISOString() }, { onConflict: 'student_id' }), 'set waiver cycle');
  const waiverA = await auth('admin@cinste.test'); const waiverB = await auth('admin@cinste.test');
  const waivers = await Promise.all([waiverA.rpc('admin_waive_impact_reciprocity', { p_student_id: student.id, p_expected_cycle_number: 12, p_reason: 'Batch 3 waiver' }), waiverB.rpc('admin_waive_impact_reciprocity', { p_student_id: student.id, p_expected_cycle_number: 12, p_reason: 'Batch 3 stale waiver' })]);
  eq(waivers.filter((result) => !result.error).length, 1, 'waiver races settle once');
  eq((await must(service.from('impact_reciprocity_state').select('cycle_number').eq('student_id', student.id).single(), 'read waived cycle')).cycle_number, 13, 'waiver advances exactly expected cycle');
  await expectFailure(admin.rpc('admin_verify_impact_participation', { p_participation_id: (await join(admin, await (async () => { const id = await createOpportunity(operator.db, organizationA); await publish(operator.db, id); return id; })())), p_reason: 'self' }), 'SELF_VERIFICATION_FORBIDDEN', 'admin self verification');

  console.log(`PASS: ${assertions} focused Impact Batch 3 hosted assertions (${run})`);
} finally {
  for (const organizationId of organizations) await admin.rpc('admin_deactivate_organization', { p_organization_id: organizationId, p_reason: 'Impact Batch 3 QA cleanup' });
}
