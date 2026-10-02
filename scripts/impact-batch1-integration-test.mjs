import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact integration tests refuse NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `Impact QA ${new Date().toISOString().replace(/[:.]/g, '-')}`;
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
async function qaUser(label, role = 'student') {
  const email = `qa.impact.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'cinste-local-2026',
    email_confirm: true,
    user_metadata: { display_name: `Impact QA ${label}`, cinste_test_data: true },
    app_metadata: { cinste_test_data: true },
  });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message ?? 'unknown error'}`);
  await must(admin.from('profiles').upsert({ id: data.user.id, email, display_name: `Impact QA ${label}`, role }, { onConflict: 'id' }), 'QA profile');
  if (role === 'student') {
    const university = await must(admin.from('universities').select('id').limit(1).single(), 'QA university');
    await must(admin.from('student_profiles').upsert({ user_id: data.user.id, full_name: `Impact QA ${label}`, university_id: university.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'QA student profile');
  }
  return { id: data.user.id, email, db: await auth(email) };
}

const migrationProbe = await admin.from('organizations').select('id').limit(1);
if (migrationProbe.error) {
  console.log(`SKIP: Impact Batch 1 migration is not applied to this hosted database (${migrationProbe.error.message}). Apply 0011 before running this test again.`);
  process.exit(0);
}

let adminUser;
const organizations = [];
try {
  adminUser = await auth('admin@cinste.test');
  const operatorA = await qaUser('operator-a');
  const operatorB = await qaUser('operator-b');

  const organizationA = await must(adminUser.rpc('admin_create_organization', { p_name: `${run} A`, p_city: 'București' }), 'admin creates organization A');
  const organizationB = await must(adminUser.rpc('admin_create_organization', { p_name: `${run} B`, p_city: 'București' }), 'admin creates organization B');
  organizations.push(organizationA, organizationB);
  await must(adminUser.rpc('admin_activate_organization', { p_organization_id: organizationA, p_reason: 'Impact Batch 1 QA approval' }), 'admin activates organization A');
  await must(adminUser.rpc('admin_activate_organization', { p_organization_id: organizationB, p_reason: 'Impact Batch 1 QA approval' }), 'admin activates organization B');
  await must(adminUser.rpc('admin_assign_organization_user', { p_organization_id: organizationA, p_user_id: operatorA.id }), 'admin assigns organization A operator');
  await must(adminUser.rpc('admin_assign_organization_user', { p_organization_id: organizationB, p_user_id: operatorB.id }), 'admin assigns organization B operator');
  check(Boolean((await operatorA.db.rpc('admin_create_organization', { p_name: `${run} forbidden` })).error), 'non-admin cannot perform organization admin actions');

  const dueAt = new Date(Date.now() + 86_400_000).toISOString();
  const opportunityA = await must(admin.from('impact_opportunities').insert({ organization_id: organizationA, title: `${run} opportunity A`, description: 'QA opportunity', category: 'community', mode: 'flexible_remote', due_at: dueAt, expected_eligible_minutes: 60, capacity: 2 }).select('id').single(), 'service creates organization A opportunity');
  const opportunityB = await must(admin.from('impact_opportunities').insert({ organization_id: organizationB, title: `${run} opportunity B`, description: 'QA opportunity', category: 'education', mode: 'flexible_remote', due_at: dueAt, expected_eligible_minutes: 60, capacity: 2 }).select('id').single(), 'service creates organization B opportunity');
  const ownOpportunity = await operatorA.db.from('impact_opportunities').select('id').eq('id', opportunityA.id);
  eq(ownOpportunity.data?.length, 1, 'organization A operator can read own organization data');
  const foreignOpportunity = await operatorA.db.from('impact_opportunities').select('id').eq('id', opportunityB.id);
  eq(foreignOpportunity.data?.length, 0, 'organization A operator cannot read organization B opportunity');
  const foreignOrganization = await operatorA.db.from('organizations').select('id').eq('id', organizationB);
  eq(foreignOrganization.data?.length, 0, 'organization A operator cannot read organization B organization record');

  check(Boolean((await operatorA.db.from('organizations').insert({ name: `${run} unauthorized` })).error), 'direct unauthorized organization write fails');
  check(Boolean((await operatorA.db.from('impact_opportunities').insert({ organization_id: organizationA, title: 'Unauthorized', description: 'Unauthorized', category: 'community', mode: 'flexible_remote', due_at: dueAt, expected_eligible_minutes: 60, capacity: 1 })).error), 'direct unauthorized opportunity write fails');
  check(Boolean((await operatorA.db.from('impact_participations').insert({ opportunity_id: opportunityA.id, student_id: operatorA.id })).error), 'direct unauthorized participation write fails');

  const participation = await must(admin.from('impact_participations').insert({ opportunity_id: opportunityA.id, student_id: operatorA.id, status: 'completed', resolved_at: new Date().toISOString() }).select('id').single(), 'service creates completed QA participation');
  await must(admin.from('impact_reciprocity_state').insert({ student_id: operatorA.id }), 'service creates QA reciprocity state');
  check(Boolean((await operatorA.db.from('impact_contributions').insert({ participation_id: participation.id, student_id: operatorA.id, organization_id: organizationA, verified_minutes: 60, verifier_id: operatorA.id })).error), 'student cannot directly insert an Impact contribution');
  check(Boolean((await operatorA.db.from('impact_reciprocity_state').update({ community_redemption_count: 1 }).eq('student_id', operatorA.id)).error), 'student cannot directly update reciprocity state');
  check(Boolean((await operatorA.db.from('impact_reciprocity_state').delete().eq('student_id', operatorA.id)).error), 'student cannot directly delete reciprocity state');

  await must(adminUser.rpc('admin_revoke_organization_user', { p_organization_id: organizationA, p_user_id: operatorA.id, p_reason: 'Impact Batch 1 QA revocation' }), 'admin revokes organization A operator');
  const revokedOrganization = await operatorA.db.from('organizations').select('id').eq('id', organizationA);
  eq(revokedOrganization.data?.length, 0, 'assignment revocation removes organization access');
  const revokedOpportunity = await operatorA.db.from('impact_opportunities').select('id').eq('id', opportunityA.id);
  eq(revokedOpportunity.data?.length, 0, 'assignment revocation removes opportunity access');

  await must(adminUser.rpc('admin_deactivate_organization', { p_organization_id: organizationB, p_reason: 'Impact Batch 1 QA deactivation' }), 'admin deactivates organization B');
  const auditRows = await must(adminUser.from('impact_audit_events').select('action,target_type').in('target_id', organizations), 'admin reads Impact audit events');
  check(auditRows.some((row) => row.action === 'created' && row.target_type === 'organization'), 'organization admin actions create audit events');
  console.log(`PASS: ${assertions} focused Impact Batch 1 hosted assertions (${run})`);
} finally {
  if (adminUser) {
    for (const organizationId of organizations) {
      await adminUser.rpc('admin_deactivate_organization', { p_organization_id: organizationId, p_reason: 'Impact Batch 1 QA cleanup' });
    }
  }
}
