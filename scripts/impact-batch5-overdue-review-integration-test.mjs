import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact Batch 5 integration refuses NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[name]) throw new Error(`Missing ${name}`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const run = `Impact Batch 5 review ${new Date().toISOString().replace(/[:.]/g, '-')}`;
let assertions = 0; const check = (value, message) => { assert.ok(value, message); assertions += 1; };
async function must(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; }
async function auth(email) { const db = createClient(url, publishable, options); const { error } = await db.auth.signInWithPassword({ email, password: 'cinste-local-2026' }); if (error) throw new Error(`Login ${email}: ${error.message}`); return db; }
async function user(label, role = 'student') { const email = `qa.impact.batch5.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`; const { data, error } = await service.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, user_metadata: { cinste_test_data: true }, app_metadata: { cinste_test_data: true } }); if (error || !data.user) throw new Error(`Create ${label}: ${error?.message}`); await must(service.from('profiles').upsert({ id: data.user.id, email, display_name: label, role }, { onConflict: 'id' }), 'profile'); if (role === 'student') { const university = await must(service.from('universities').select('id').limit(1).single(), 'university'); await must(service.from('student_profiles').upsert({ user_id: data.user.id, full_name: label, university_id: university.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'student'); } return { id: data.user.id, email, db: await auth(email) }; }
let organizationId;
const migrationProbe = await service.rpc('student_request_impact_overdue_review', { p_participation_id: crypto.randomUUID() });
if (migrationProbe.error?.code === 'PGRST202' || migrationProbe.error?.message.includes('Could not find the function')) {
  console.log('SKIP: Impact Batch 5 migration 0016 is not applied to this hosted database. Apply it before running this test.');
  process.exit(0);
}
try {
  const admin = await auth('admin@cinste.test'); const operator = await user('batch5-operator'); const owner = await user('batch5-owner'); const other = await user('batch5-other');
  organizationId = await must(admin.rpc('admin_create_organization', { p_name: run, p_city: 'Bucharest' }), 'create organization'); await must(admin.rpc('admin_activate_organization', { p_organization_id: organizationId, p_reason: 'Batch 5 QA' }), 'activate organization'); await must(admin.rpc('admin_assign_organization_user', { p_organization_id: organizationId, p_user_id: operator.id }), 'assign operator');
  const opportunityId = await must(operator.db.rpc('organization_create_impact_opportunity', { p_organization_id: organizationId, p_title: run, p_description: 'Overdue review request test', p_category: 'community', p_mode: 'scheduled', p_city: 'Bucharest', p_starts_at: new Date(Date.now() + 3600000).toISOString(), p_ends_at: new Date(Date.now() + 7200000).toISOString(), p_due_at: new Date(Date.now() + 7200000).toISOString(), p_expected_eligible_minutes: 60, p_capacity: 5 }), 'create opportunity'); await must(operator.db.rpc('organization_submit_impact_opportunity', { p_opportunity_id: opportunityId }), 'submit opportunity'); await must(admin.rpc('admin_review_impact_opportunity', { p_opportunity_id: opportunityId, p_decision: 'approved', p_risk_state: 'allowed_low_risk', p_reason: 'Batch 5 QA approval' }), 'approve opportunity');
  const participationId = await must(owner.db.rpc('student_join_impact_opportunity', { p_opportunity_id: opportunityId }), 'join opportunity');
  await must(service.from('impact_participations').update({ status: 'overdue', updated_at: new Date().toISOString() }).eq('id', participationId), 'prepare overdue participation');
  const first = await must(owner.db.rpc('student_request_impact_overdue_review', { p_participation_id: participationId, p_reason: 'Awaiting organization review' }), 'owner requests review');
  const second = await must(owner.db.rpc('student_request_impact_overdue_review', { p_participation_id: participationId, p_reason: 'Different duplicate request' }), 'owner repeats review request'); check(first === second, 'duplicate request is idempotent');
  const requests = await must(service.from('impact_overdue_review_requests').select('*').eq('participation_id', participationId), 'service reads request'); check(requests.length === 1 && requests[0].student_id === owner.id, 'one owner-scoped request exists');
  check((await must(service.from('impact_audit_events').select('id').eq('target_id', participationId).eq('action', 'overdue_review_requested'), 'audit request')).length === 1, 'one audit event exists');
  const otherAttempt = await other.db.rpc('student_request_impact_overdue_review', { p_participation_id: participationId }); check(Boolean(otherAttempt.error?.message.includes('PARTICIPATION_NOT_FOUND')), 'another student cannot request review');
  await must(service.from('impact_participations').update({ status: 'joined', updated_at: new Date().toISOString() }).eq('id', participationId), 'prepare invalid status'); const invalid = await owner.db.rpc('student_request_impact_overdue_review', { p_participation_id: participationId }); check(Boolean(invalid.error?.message.includes('PARTICIPATION_NOT_OVERDUE')), 'only overdue participation is accepted');
  const direct = await owner.db.from('impact_overdue_review_requests').update({ reason: 'Attempted direct mutation' }).eq('participation_id', participationId); check(Boolean(direct.error), 'direct request writes are rejected');
  const after = await must(service.from('impact_participations').select('status,resolved_at').eq('id', participationId).single(), 'read participation'); check(after.status === 'joined' && after.resolved_at === null, 'review request has no contribution or settlement side effect');
  const adminVisible = await must(admin.from('impact_overdue_review_requests').select('participation_id,student_id,requested_at').eq('participation_id', participationId), 'admin reads request'); check(adminVisible.length === 1, 'Admin visibility is retained');
  console.log(`PASS: ${assertions} focused Impact Batch 5 overdue-review assertions (${run})`);
} finally { if (organizationId) { const admin = await auth('admin@cinste.test'); await admin.rpc('admin_deactivate_organization', { p_organization_id: organizationId, p_reason: 'Batch 5 QA cleanup' }); } }
