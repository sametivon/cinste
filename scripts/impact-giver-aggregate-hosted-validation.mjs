import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact aggregate validation refuses NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[name]) throw new Error(`Missing ${name}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `impact-giver-${Date.now()}`;
const users = [];
const opportunities = [];
const participations = [];
const contributions = [];
const organizationIds = [];
let assertions = 0;

function check(condition, message) { assertions += 1; if (!condition) throw new Error(`ASSERTION FAILED: ${message}`); }
async function must(query, message) { const { data, error } = await query; if (error) throw new Error(`${message}: ${error.message}`); return data; }
async function account(label, role) {
  const email = `${run}.${label}@cinste.test`;
  const password = 'CinsteImpact2026!';
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message ?? 'no user'}`);
  users.push(data.user.id);
  await must(service.from('profiles').update({ role }).eq('id', data.user.id), `set ${label} role`);
  if (role === 'student') await must(service.from('student_profiles').insert({ user_id: data.user.id, full_name: `Impact QA ${label}`, verification_status: 'verified' }), `create ${label} student profile`);
  return { id: data.user.id, email, password };
}
async function signedIn(user) {
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  await must(db.auth.signInWithPassword({ email: user.email, password: user.password }), `sign in ${user.email}`);
  return db;
}

try {
  const anonymous = await createClient(url, publishable).rpc('list_community_impact_outcomes');
  check(Boolean(anonymous.error) && anonymous.error.code === '42501', 'anonymous execution is denied');
  const admin = await account('admin', 'admin');
  const giver = await account('giver', 'giver');
  const students = await Promise.all(['one', 'two', 'three', 'four', 'five'].map(label => account(label, 'student')));
  const adminDb = await signedIn(admin);
  const giverDb = await signedIn(giver);
  const beforeContributions = await must(service.from('impact_contributions').select('student_id,verified_minutes').is('revoked_at', null), 'read aggregate baseline');
  const beforeStudents = new Set(beforeContributions.map(row => row.student_id));
  const beforeHours = beforeContributions.reduce((sum, row) => sum + row.verified_minutes, 0) / 60;
  const organization = await must(service.from('organizations').insert({ name: `${run} organization`, status: 'active' }).select('id').single(), 'create organization');
  organizationIds.push(organization.id);

  for (const [index, student] of students.entries()) {
    const opportunity = await must(service.from('impact_opportunities').insert({ organization_id: organization.id, title: `${run} opportunity ${index}`, description: 'Structured low-risk QA work', category: 'community', mode: 'flexible_remote', due_at: new Date(Date.now() + 86_400_000).toISOString(), expected_eligible_minutes: 30, capacity: 5, status: 'published', published_at: new Date().toISOString() }).select('id').single(), `create opportunity ${index}`);
    opportunities.push(opportunity.id);
    const participation = await must(service.from('impact_participations').insert({ opportunity_id: opportunity.id, student_id: student.id }).select('id').single(), `create participation ${index}`);
    participations.push(participation.id);
    const contribution = await must(adminDb.rpc('admin_verify_impact_participation', { p_participation_id: participation.id, p_reason: 'Disposable aggregate validation' }), `verify contribution ${index}`);
    contributions.push(contribution);
  }

  const { data, error } = await giverDb.rpc('list_community_impact_outcomes');
  if (error) throw new Error(`aggregate RPC: ${error.message}`);
  check(data?.length === 1, 'one aggregate row is returned');
  check(data[0].outcome_state === 'available', 'aggregate threshold is met');
  check(data[0].completed_impact_activities === beforeContributions.length + 5, 'aggregate activity count includes exactly the five new activities');
  check(data[0].total_impact_hours === Math.round((beforeHours + 2.5) * 10) / 10, 'aggregate hours include exactly the five new activities');
  check(data[0].participating_students === beforeStudents.size + 5, 'aggregate Student count includes exactly the five new Students');
  check(!Object.keys(data[0]).some(key => /_id$|email|name|campaign|opportunity/i.test(key)), 'response contains no attribution or participant identifiers');
  console.log(`PASS: ${assertions} hosted Giver Impact aggregate assertions (Impact Giver Aggregate ${run})`);
} finally {
  if (contributions.length) await service.from('impact_reciprocity_settlements').delete().in('contribution_id', contributions);
  if (participations.length) await service.from('impact_audit_events').delete().in('target_id', participations);
  if (contributions.length) await service.from('impact_audit_events').delete().in('target_id', contributions);
  const studentIds = users.slice(2);
  if (studentIds.length) await service.from('impact_reciprocity_settlements').delete().in('student_id', studentIds);
  if (studentIds.length) await service.from('impact_reciprocity_state').delete().in('student_id', studentIds);
  if (contributions.length) await service.from('impact_contributions').delete().in('id', contributions);
  if (participations.length) await service.from('impact_participations').delete().in('id', participations);
  if (opportunities.length) await service.from('impact_opportunities').delete().in('id', opportunities);
  if (organizationIds.length) await service.from('organizations').delete().in('id', organizationIds);
  for (const id of users) await service.auth.admin.deleteUser(id);
}
