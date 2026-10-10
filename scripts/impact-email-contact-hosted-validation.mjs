import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact email validation refuses NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[name]) throw new Error(`Missing ${name}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `impact-email-${Date.now()}`;
const users = [];
let organizationId;
let foreignOrganizationId;
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
  if (role === 'student') await must(service.from('student_profiles').insert({ user_id: data.user.id, full_name: `Impact QA ${label}`, verification_status: 'verified', impact_18_plus_verified: true }), `create ${label} student profile`);
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await db.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`sign in ${label}: ${signedIn.error.message}`);
  return { id: data.user.id, email, db };
}
async function expectFailure(query, text, message) { const { error } = await query; check(Boolean(error) && error.message.includes(text), message); }

try {
  const admin = await account('admin', 'admin');
  const operator = await account('operator', 'student');
  const foreignOperator = await account('foreign', 'student');
  const attendee = await account('attendee', 'student');
  organizationId = await must(admin.db.rpc('admin_create_organization', { p_name: `${run} organization`, p_city: 'Bucharest' }), 'create organization');
  foreignOrganizationId = await must(admin.db.rpc('admin_create_organization', { p_name: `${run} foreign`, p_city: 'Bucharest' }), 'create foreign organization');
  for (const id of [organizationId, foreignOrganizationId]) await must(admin.db.rpc('admin_activate_organization', { p_organization_id: id, p_reason: 'email validation' }), 'activate organization');
  await must(admin.db.rpc('admin_assign_organization_user', { p_organization_id: organizationId, p_user_id: operator.id }), 'assign operator');
  await must(admin.db.rpc('admin_assign_organization_user', { p_organization_id: foreignOrganizationId, p_user_id: foreignOperator.id }), 'assign foreign operator');
  await expectFailure(operator.db.rpc('organization_create_impact_opportunity', { p_organization_id: organizationId, p_title: `${run} phone`, p_description: 'Structured work', p_category: 'community', p_mode: 'flexible_remote', p_city: 'Bucharest', p_starts_at: null, p_ends_at: null, p_due_at: new Date(Date.now() + 86_400_000).toISOString(), p_expected_eligible_minutes: 60, p_capacity: 5, p_activity_details: 'Students complete structured QA support.', p_requirements: null, p_organization_provides: 'A coordinator.', p_coordinator_name: 'Coordinator', p_coordinator_contact: 'qa@example.invalid', p_accessibility_information: null, p_participant_contact_fields: ['phone'] }), 'PHONE_CONTACT_NOT_AVAILABLE', 'phone requests are rejected');
  opportunityId = await must(operator.db.rpc('organization_create_impact_opportunity', { p_organization_id: organizationId, p_title: `${run} opportunity`, p_description: 'Structured work', p_category: 'community', p_mode: 'flexible_remote', p_city: 'Bucharest', p_starts_at: null, p_ends_at: null, p_due_at: new Date(Date.now() + 86_400_000).toISOString(), p_expected_eligible_minutes: 60, p_capacity: 5, p_activity_details: 'Students complete structured QA support.', p_requirements: null, p_organization_provides: 'A coordinator.', p_coordinator_name: 'Coordinator', p_coordinator_contact: 'qa@example.invalid', p_accessibility_information: null, p_participant_contact_fields: ['email'] }), 'create email opportunity');
  await must(operator.db.rpc('organization_submit_impact_opportunity', { p_opportunity_id: opportunityId }), 'submit opportunity');
  await must(admin.db.rpc('admin_review_impact_opportunity', { p_opportunity_id: opportunityId, p_decision: 'approved', p_risk_state: 'allowed_low_risk', p_reason: 'email validation' }), 'approve opportunity');
  const discovery = await must(attendee.db.rpc('list_impact_opportunities', { p_category: null, p_city: null }), 'read discovery');
  check(discovery.some(row => row.id === opportunityId && row.participant_contact_fields.includes('email') && !row.participant_contact_fields.includes('phone')), 'Student sees email requirement before joining');
  participationId = await must(attendee.db.rpc('student_join_impact_opportunity', { p_opportunity_id: opportunityId }), 'join opportunity');
  const active = await must(operator.db.rpc('list_organization_impact_participants', { p_opportunity_ids: [opportunityId] }), 'read active participant');
  check(active.length === 1 && active[0].participant_email === attendee.email, 'assigned Organization sees email during the activity window');
  const foreign = await must(foreignOperator.db.rpc('list_organization_impact_participants', { p_opportunity_ids: [opportunityId] }), 'read foreign participant');
  check(foreign.length === 0, 'foreign Organization cannot read the participant');
  const forcedExpiry = new Date(0).toISOString();
  await must(service.from('impact_participations').update({ participant_email_access_expires_at: forcedExpiry }).eq('id', participationId), 'expire email access');
  const storedExpiry = await must(service.from('impact_participations').select('participant_email_access_expires_at').eq('id', participationId).single(), 'read expired email access');
  check(new Date(storedExpiry.participant_email_access_expires_at).getTime() <= Date.now(), 'email expiry is stored in the past');
  const expired = await must(operator.db.rpc('list_organization_impact_participants', { p_opportunity_ids: [opportunityId] }), 'read expired participant');
  check(expired.length === 1 && expired[0].participant_email === null, 'email is hidden after the activity window');
  console.log(`PASS: ${assertions} hosted Impact email-contact assertions (${run})`);
} finally {
  if (participationId) await service.from('impact_audit_events').delete().eq('target_id', participationId);
  if (participationId) await service.from('impact_participations').delete().eq('id', participationId);
  if (opportunityId) await service.from('impact_opportunities').delete().eq('id', opportunityId);
  for (const id of [organizationId, foreignOrganizationId].filter(Boolean)) {
    await service.from('organization_users').delete().eq('organization_id', id);
    await service.from('organizations').delete().eq('id', id);
  }
  for (const id of users) { await service.from('impact_audit_events').delete().eq('target_id', id); await service.auth.admin.deleteUser(id); }
}
