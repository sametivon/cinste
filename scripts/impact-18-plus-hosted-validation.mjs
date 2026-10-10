import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact 18+ validation refuses NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[name]) throw new Error(`Missing ${name}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `impact-18-plus-${Date.now()}`;
const users = [];
let organizationId;
let opportunityId;
let participationId;
let assertions = 0;

function check(value, message) { assertions += 1; assert.ok(value, message); }
async function must(query, message) { const { data, error } = await query; if (error) throw new Error(`${message}: ${error.message}`); return data; }
async function account(label, role) {
  const email = `${run}.${label}@cinste.test`;
  const password = 'CinsteImpact2026!';
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message ?? 'no user'}`);
  users.push(data.user.id);
  await must(service.from('profiles').update({ role }).eq('id', data.user.id), `set ${label} role`);
  if (role === 'student') await must(service.from('student_profiles').insert({ user_id: data.user.id, full_name: `Impact QA ${label}`, verification_status: 'verified' }), `create ${label} student profile`);
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await db.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`sign in ${label}: ${signedIn.error.message}`);
  return { id: data.user.id, db };
}

try {
  const admin = await account('admin', 'admin');
  const operator = await account('operator', 'student');
  const attendee = await account('attendee', 'student');
  organizationId = await must(admin.db.rpc('admin_create_organization', { p_name: `${run} organization`, p_city: 'Bucharest' }), 'create organization');
  await must(admin.db.rpc('admin_activate_organization', { p_organization_id: organizationId, p_reason: '18+ validation' }), 'activate organization');
  await must(admin.db.rpc('admin_assign_organization_user', { p_organization_id: organizationId, p_user_id: operator.id }), 'assign operator');
  opportunityId = await must(operator.db.rpc('organization_create_impact_opportunity', {
    p_organization_id: organizationId, p_title: `${run} opportunity`, p_description: 'Structured low-risk QA work', p_category: 'community', p_mode: 'flexible_remote', p_city: 'Bucharest', p_starts_at: null, p_ends_at: null, p_due_at: new Date(Date.now() + 86_400_000).toISOString(), p_expected_eligible_minutes: 60, p_capacity: 5, p_activity_details: 'Students complete structured QA support.', p_requirements: null, p_organization_provides: 'A named coordinator and workspace.', p_coordinator_name: 'QA Coordinator', p_coordinator_contact: 'qa@example.invalid', p_accessibility_information: null, p_participant_contact_fields: [],
  }), 'create opportunity');
  await must(operator.db.rpc('organization_submit_impact_opportunity', { p_opportunity_id: opportunityId }), 'submit opportunity');
  await must(admin.db.rpc('admin_review_impact_opportunity', { p_opportunity_id: opportunityId, p_decision: 'approved', p_risk_state: 'allowed_low_risk', p_reason: '18+ validation' }), 'approve opportunity');
  const denied = await attendee.db.rpc('student_join_impact_opportunity', { p_opportunity_id: opportunityId });
  check(Boolean(denied.error) && denied.error.message.includes('STUDENT_IMPACT_18_PLUS_REQUIRED'), 'unverified 18+ Student cannot join');
  await must(admin.db.rpc('admin_set_student_impact_eligibility', { p_student_id: attendee.id, p_eligible: true, p_reason: 'Reviewed age evidence' }), 'set 18+ eligibility');
  participationId = await must(attendee.db.rpc('student_join_impact_opportunity', { p_opportunity_id: opportunityId }), 'eligible Student joins');
  const projection = await must(operator.db.rpc('list_organization_impact_participants', { p_opportunity_ids: [opportunityId] }), 'read participant projection');
  check(projection.length === 1 && projection[0].eligibility_status === 'verified_18_plus', 'Organization sees only minimized 18+ eligibility');
  await must(admin.db.rpc('admin_set_student_impact_eligibility', { p_student_id: attendee.id, p_eligible: false, p_reason: 'Eligibility review withdrawn' }), 'revoke 18+ eligibility');
  const audits = await must(service.from('impact_audit_events').select('action').eq('target_type', 'student_profile').eq('target_id', attendee.id), 'read eligibility audit');
  check(audits.filter(row => row.action === 'impact_18_plus_verified').length === 1 && audits.filter(row => row.action === 'impact_18_plus_revoked').length === 1, 'eligibility changes are audited');
  console.log(`PASS: ${assertions} hosted Impact 18+ assertions (${run})`);
} finally {
  if (participationId) await service.from('impact_audit_events').delete().eq('target_id', participationId);
  if (participationId) await service.from('impact_participations').delete().eq('id', participationId);
  if (opportunityId) await service.from('impact_opportunities').delete().eq('id', opportunityId);
  if (organizationId) await service.from('organization_users').delete().eq('organization_id', organizationId);
  if (organizationId) await service.from('organizations').delete().eq('id', organizationId);
  for (const id of users) {
    await service.from('impact_audit_events').delete().eq('target_id', id);
    await service.auth.admin.deleteUser(id);
  }
}
