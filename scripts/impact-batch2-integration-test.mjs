import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact integration tests refuse NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `Impact Batch 2 QA ${new Date().toISOString().replace(/[:.]/g, '-')}`;
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
async function qaStudent(label) {
  const email = `qa.impact.batch2.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, user_metadata: { cinste_test_data: true }, app_metadata: { cinste_test_data: true } });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message ?? 'unknown error'}`);
  await must(admin.from('profiles').upsert({ id: data.user.id, email, display_name: `Impact Batch 2 ${label}`, role: 'student' }, { onConflict: 'id' }), 'QA profile');
  const university = await must(admin.from('universities').select('id').limit(1).single(), 'QA university');
  await must(admin.from('student_profiles').upsert({ user_id: data.user.id, full_name: `Impact Batch 2 ${label}`, university_id: university.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'QA student profile');
  return { id: data.user.id, email, db: await auth(email) };
}
async function rpcMust(db, fn, args, label) { return must(db.rpc(fn, args), label); }
async function createOpportunity(db, organizationId, values = {}) {
  const mode = values.mode ?? 'flexible_remote';
  const startsAt = values.startsAt ?? null;
  const endsAt = values.endsAt ?? null;
  const dueAt = values.dueAt ?? new Date(Date.now() + 86_400_000).toISOString();
  return rpcMust(db, 'organization_create_impact_opportunity', {
    p_organization_id: organizationId,
    p_title: `${run} opportunity`, p_description: 'Batch 2 QA opportunity', p_category: values.category ?? 'community',
    p_mode: mode, p_city: values.city ?? 'București', p_starts_at: startsAt, p_ends_at: endsAt,
    p_due_at: dueAt, p_expected_eligible_minutes: 60, p_capacity: values.capacity ?? 10,
    p_activity_details: values.activityDetails ?? 'Students complete structured QA support.', p_requirements: values.requirements ?? null, p_organization_provides: values.organizationProvides ?? 'A named coordinator and workspace.', p_coordinator_name: values.coordinatorName ?? 'QA Coordinator', p_coordinator_contact: values.coordinatorContact ?? 'qa@example.invalid', p_accessibility_information: values.accessibilityInformation ?? 'Ask the coordinator about access needs.', p_participant_contact_fields: values.participantContactFields ?? [],
  }, 'organization creates opportunity');
}
async function publish(db, id) { await rpcMust(db, 'organization_submit_impact_opportunity', { p_opportunity_id: id }, 'organization submits opportunity'); return rpcMust(adminUser, 'admin_review_impact_opportunity', { p_opportunity_id: id, p_decision: 'approved', p_risk_state: 'allowed_low_risk', p_reason: 'Batch 2 QA approval' }, 'Admin approves opportunity'); }
async function join(db, id) { return db.rpc('student_join_impact_opportunity', { p_opportunity_id: id }); }

let adminUser;
const organizations = [];
adminUser = await auth('admin@cinste.test');
const migrationProbe = await adminUser.rpc('list_impact_opportunities', { p_category: null, p_city: null });
if (migrationProbe.error?.code === 'PGRST202' || migrationProbe.error?.message.includes('Could not find the function')) {
  console.log(`SKIP: Impact Batch 2 migration is not applied to this hosted database (${migrationProbe.error.message}). Apply 0012 before running this test again.`);
  process.exit(0);
}
// The probe is authenticated but not a verified student; STUDENT_NOT_VERIFIED
// confirms the RPC is present. The real discovery assertion uses a verified QA
// student below.

try {
  const operatorA = await qaStudent('operator-a');
  const operatorB = await qaStudent('operator-b');
  const studentA = await qaStudent('student-a');
  const studentB = await qaStudent('student-b');
  const maxTwoStudent = await qaStudent('max-two');
  const overlapStudent = await qaStudent('overlap');
  const raceStudentA = await qaStudent('race-a');
  const raceStudentB = await qaStudent('race-b');

  const organizationA = await rpcMust(adminUser, 'admin_create_organization', { p_name: `${run} A`, p_city: 'București' }, 'admin creates organization A');
  const organizationB = await rpcMust(adminUser, 'admin_create_organization', { p_name: `${run} B`, p_city: 'București' }, 'admin creates organization B');
  organizations.push(organizationA, organizationB);
  await rpcMust(adminUser, 'admin_activate_organization', { p_organization_id: organizationA, p_reason: 'Batch 2 QA' }, 'admin activates organization A');
  await rpcMust(adminUser, 'admin_activate_organization', { p_organization_id: organizationB, p_reason: 'Batch 2 QA' }, 'admin activates organization B');
  await rpcMust(adminUser, 'admin_assign_organization_user', { p_organization_id: organizationA, p_user_id: operatorA.id }, 'admin assigns organization A operator');
  await rpcMust(adminUser, 'admin_assign_organization_user', { p_organization_id: organizationB, p_user_id: operatorB.id }, 'admin assigns organization B operator');

  const draftA = await createOpportunity(operatorA.db, organizationA);
  await rpcMust(operatorA.db, 'organization_update_impact_opportunity', {
    p_opportunity_id: draftA, p_title: `${run} edited`, p_description: 'Edited QA opportunity', p_category: 'education', p_mode: 'flexible_remote', p_city: 'București', p_starts_at: null, p_ends_at: null, p_due_at: new Date(Date.now() + 86_400_000).toISOString(), p_expected_eligible_minutes: 90, p_capacity: 5,
    p_activity_details: 'Students complete structured QA support.', p_requirements: null, p_organization_provides: 'A named coordinator and workspace.', p_coordinator_name: 'QA Coordinator', p_coordinator_contact: 'qa@example.invalid', p_accessibility_information: null, p_participant_contact_fields: [],
  }, 'organization updates draft opportunity');
  await publish(operatorA.db, draftA);
  const publishedDiscovery = await rpcMust(studentA.db, 'list_impact_opportunities', { p_category: null, p_city: null }, 'student discovers published opportunities');
  check(publishedDiscovery.some((row) => row.id === draftA), 'verified student discovery returns published opportunity');
  check(publishedDiscovery.every((row) => row.status === undefined), 'student discovery does not expose internal lifecycle status');

  const draftB = await createOpportunity(operatorB.db, organizationB);
  const crossOrgDraft = await operatorA.db.from('impact_opportunities').select('id').eq('id', draftB);
  eq(crossOrgDraft.data?.length, 0, 'organization A operator cannot read organization B draft');
  check(Boolean((await operatorA.db.from('impact_opportunities').update({ status: 'published' }).eq('id', draftB)).error), 'operator cannot directly mutate opportunity status');
  check(Boolean((await studentA.db.from('impact_participations').update({ status: 'completed' }).eq('id', crypto.randomUUID())).error), 'student cannot directly mutate participation status');

  const raceStart = new Date(Date.now() + 7_200_000).toISOString();
  const raceEnd = new Date(Date.now() + 10_800_000).toISOString();
  const raceOpportunity = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: raceStart, endsAt: raceEnd, dueAt: raceEnd, capacity: 1 });
  await publish(operatorA.db, raceOpportunity);
  const raceResults = await Promise.all([join(raceStudentA.db, raceOpportunity), join(raceStudentB.db, raceOpportunity)]);
  eq(raceResults.filter((result) => !result.error).length, 1, 'concurrent final-slot joins allow exactly one student');
  const raceParticipation = raceResults.find((result) => !result.error)?.data;
  check(Boolean(raceParticipation), 'winning final-slot join returns a participation');

  const maxTwoIds = [];
  for (let index = 0; index < 3; index += 1) {
    const opportunity = await createOpportunity(operatorA.db, organizationA);
    await publish(operatorA.db, opportunity);
    maxTwoIds.push(opportunity);
  }
  await must(join(maxTwoStudent.db, maxTwoIds[0]), 'max-two first join');
  await must(join(maxTwoStudent.db, maxTwoIds[1]), 'max-two second join');
  check((await join(maxTwoStudent.db, maxTwoIds[2])).error?.message.includes('ACTIVE_PARTICIPATION_LIMIT_REACHED'), 'third active participation is rejected');

  const overlapStartA = new Date(Date.now() + 14_400_000).toISOString();
  const overlapEndA = new Date(Date.now() + 18_000_000).toISOString();
  const overlapStartB = new Date(Date.now() + 16_200_000).toISOString();
  const overlapEndB = new Date(Date.now() + 19_800_000).toISOString();
  const overlapA = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: overlapStartA, endsAt: overlapEndA, dueAt: overlapEndA });
  const overlapB = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: overlapStartB, endsAt: overlapEndB, dueAt: overlapEndB });
  await publish(operatorA.db, overlapA); await publish(operatorA.db, overlapB);
  await must(join(overlapStudent.db, overlapA), 'overlap first join');
  check((await join(overlapStudent.db, overlapB)).error?.message.includes('SCHEDULE_OVERLAP'), 'scheduled overlap is rejected');

  const normalCancel = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: new Date(Date.now() + 46_800_000).toISOString(), endsAt: new Date(Date.now() + 50_400_000).toISOString(), dueAt: new Date(Date.now() + 50_400_000).toISOString() });
  await publish(operatorA.db, normalCancel);
  const normalParticipation = await rpcMust(studentA.db, 'student_join_impact_opportunity', { p_opportunity_id: normalCancel }, 'student joins normal cancellation opportunity');
  eq(await rpcMust(studentA.db, 'student_cancel_impact_participation', { p_participation_id: normalParticipation }, 'student normal cancellation'), 'cancelled', 'scheduled cancellation at least 12 hours before start is normal');

  const lateCancel = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: new Date(Date.now() + 28_800_000).toISOString(), endsAt: new Date(Date.now() + 32_400_000).toISOString(), dueAt: new Date(Date.now() + 32_400_000).toISOString() });
  await publish(operatorA.db, lateCancel);
  const lateParticipation = await rpcMust(studentB.db, 'student_join_impact_opportunity', { p_opportunity_id: lateCancel }, 'student joins late cancellation opportunity');
  eq(await rpcMust(studentB.db, 'student_cancel_impact_participation', { p_participation_id: lateParticipation }, 'student late cancellation'), 'late_cancelled', 'scheduled cancellation inside 12 hours is late cancellation');

  const flexibleCancel = await createOpportunity(operatorA.db, organizationA);
  await publish(operatorA.db, flexibleCancel);
  const flexibleParticipation = await rpcMust(studentA.db, 'student_join_impact_opportunity', { p_opportunity_id: flexibleCancel }, 'student joins flexible opportunity');
  eq(await rpcMust(studentA.db, 'student_cancel_impact_participation', { p_participation_id: flexibleParticipation }, 'student flexible cancellation'), 'cancelled', 'flexible opportunity can be cancelled before due_at');

  const expiredFlexible = await createOpportunity(operatorA.db, organizationA);
  await publish(operatorA.db, expiredFlexible);
  const expiredParticipation = await rpcMust(studentB.db, 'student_join_impact_opportunity', { p_opportunity_id: expiredFlexible }, 'student joins expiry opportunity');
  await must(admin.from('impact_opportunities').update({ due_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', expiredFlexible), 'force flexible due_at for QA');
  // Direct maintenance is private after 0018. A normal trusted join still
  // performs opportunistic expiry under the authenticated student's identity.
  const expiryProbe = await createOpportunity(operatorA.db, organizationA);
  await publish(operatorA.db, expiryProbe);
  const expiryProbeParticipation = await rpcMust(studentB.db, 'student_join_impact_opportunity', { p_opportunity_id: expiryProbe }, 'expire flexible participation through trusted join');
  await rpcMust(studentB.db, 'student_cancel_impact_participation', { p_participation_id: expiryProbeParticipation }, 'release expiry probe participation');
  const expiredRow = await must(studentB.db.from('impact_participations').select('status').eq('id', expiredParticipation).single(), 'read expired flexible participation');
  eq(expiredRow.status, 'expired_incomplete', 'flexible participation expires incomplete after due_at');

  const noShowOpportunity = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: new Date(Date.now() + 7_200_000).toISOString(), endsAt: new Date(Date.now() + 10_800_000).toISOString(), dueAt: new Date(Date.now() + 10_800_000).toISOString() });
  await publish(operatorA.db, noShowOpportunity);
  const noShowParticipation = await rpcMust(studentA.db, 'student_join_impact_opportunity', { p_opportunity_id: noShowOpportunity }, 'student joins no-show opportunity');
  await must(admin.from('impact_opportunities').update({ starts_at: new Date(Date.now() - 7_200_000).toISOString(), ends_at: new Date(Date.now() - 3_600_000).toISOString(), due_at: new Date(Date.now() - 3_600_000).toISOString() }).eq('id', noShowOpportunity), 'force completed schedule for QA');
  await rpcMust(operatorA.db, 'organization_resolve_impact_participation', { p_participation_id: noShowParticipation, p_outcome: 'no_show', p_reason: 'QA no-show outcome' }, 'organization records no-show');
  eq((await must(studentA.db.from('impact_participations').select('status').eq('id', noShowParticipation).single(), 'read no-show')).status, 'no_show', 'organization can record no-show');
  await rpcMust(studentA.db, 'student_dispute_impact_participation', { p_participation_id: noShowParticipation, p_reason: 'QA dispute' }, 'student disputes no-show');
  eq((await must(studentA.db.from('impact_participations').select('status').eq('id', noShowParticipation).single(), 'read disputed outcome')).status, 'disputed', 'student can dispute no-show');

  const excusedOpportunity = await createOpportunity(operatorA.db, organizationA, { mode: 'scheduled', startsAt: new Date(Date.now() + 7_200_000).toISOString(), endsAt: new Date(Date.now() + 10_800_000).toISOString(), dueAt: new Date(Date.now() + 10_800_000).toISOString() });
  await publish(operatorA.db, excusedOpportunity);
  const excusedParticipation = await rpcMust(studentB.db, 'student_join_impact_opportunity', { p_opportunity_id: excusedOpportunity }, 'student joins excused opportunity');
  await must(admin.from('impact_opportunities').update({ starts_at: new Date(Date.now() - 7_200_000).toISOString(), ends_at: new Date(Date.now() - 3_600_000).toISOString(), due_at: new Date(Date.now() - 3_600_000).toISOString() }).eq('id', excusedOpportunity), 'force excused schedule for QA');
  await rpcMust(operatorA.db, 'organization_resolve_impact_participation', { p_participation_id: excusedParticipation, p_outcome: 'excused', p_reason: 'QA excused outcome' }, 'organization records excused outcome');
  eq((await must(studentB.db.from('impact_participations').select('status').eq('id', excusedParticipation).single(), 'read excused outcome')).status, 'excused', 'organization can record excused outcome');

  const organizationCancelOpportunity = await createOpportunity(operatorA.db, organizationA);
  await publish(operatorA.db, organizationCancelOpportunity);
  const organizationCancelledParticipation = await rpcMust(studentB.db, 'student_join_impact_opportunity', { p_opportunity_id: organizationCancelOpportunity }, 'student joins organization cancellation opportunity');
  await rpcMust(operatorA.db, 'organization_cancel_impact_opportunity', { p_opportunity_id: organizationCancelOpportunity, p_reason: 'Organization QA cancellation' }, 'organization cancels opportunity');
  eq((await must(studentB.db.from('impact_participations').select('status').eq('id', organizationCancelledParticipation).single(), 'read organization cancellation')).status, 'cancelled_by_organization', 'organization cancellation has no student penalty outcome');

  const ownParticipant = await operatorA.db.from('impact_participations').select('id').eq('opportunity_id', organizationCancelOpportunity);
  const foreignParticipant = await operatorB.db.from('impact_participations').select('id').eq('opportunity_id', organizationCancelOpportunity);
  check(ownParticipant.data?.some((row) => row.id === organizationCancelledParticipation), 'organization operator can read own participants');
  eq(foreignParticipant.data?.length, 0, 'organization B operator cannot read organization A participants');
  console.log(`PASS: ${assertions} focused Impact Batch 2 hosted assertions (${run})`);
} finally {
  if (adminUser) {
    for (const organizationId of organizations) {
      await adminUser.rpc('admin_deactivate_organization', { p_organization_id: organizationId, p_reason: 'Impact Batch 2 QA cleanup' });
    }
  }
}
