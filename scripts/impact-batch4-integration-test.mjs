import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Impact integration tests refuse NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `Impact Batch 4 QA ${new Date().toISOString().replace(/[:.]/g, '-')}`;
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions += 1; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); assertions += 1; };
async function must(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; }
async function auth(email) {
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email, password: 'cinste-local-2026' });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return db;
}
async function student(label) {
  const email = `qa.impact.batch4.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, app_metadata: { cinste_test_data: true } });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message ?? 'unknown error'}`);
  const university = await must(service.from('universities').select('id').limit(1).single(), 'seed university');
  await must(service.from('profiles').upsert({ id: data.user.id, email, display_name: label, role: 'student' }, { onConflict: 'id' }), 'student profile');
  await must(service.from('student_profiles').upsert({ user_id: data.user.id, full_name: label, university_id: university.id, verification_status: 'verified' }, { onConflict: 'user_id' }), 'verified student');
  return { id: data.user.id, db: await auth(email) };
}
async function campaign(admin, offerId, name, reciprocityType, quantity = 4) {
  return must(admin.rpc('admin_create_campaign', {
    p_offer_id: offerId, p_name: `${run} ${name}`, p_quantity: quantity,
    p_starts_at: new Date(Date.now() - 60_000).toISOString(), p_ends_at: new Date(Date.now() + 86_400_000).toISOString(),
    p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null,
    p_event_starts_at: null, p_event_ends_at: null, p_status: 'active', p_reciprocity_type: reciprocityType,
  }), `create ${reciprocityType} campaign`);
}
async function claim(db, campaignId) { return db.rpc('claim_campaign', { p_campaign_id: campaignId }); }

const probe = await service.from('impact_reciprocity_policy').select('id').limit(1);
if (probe.error) {
  console.log(`SKIP: Impact Batch 4 migration is not applied to this hosted database (${probe.error.message}). Apply 0014 after 0011-0013 before running this test again.`);
  process.exit(0);
}

// This runner deliberately requires a fresh, isolated hosted test database:
// policy activation is a one-time product cutover and must never be reset by QA.
const admin = await auth('admin@cinste.test');
const cafe = await auth('cafe.partner@cinste.test');
const policy = await must(service.from('impact_reciprocity_policy').select('*').single(), 'read policy');
if (policy.activated_at) throw new Error('Batch 4 cutover test requires a fresh hosted test database with inactive policy.');

const cappuccino = await must(service.from('offers').select('id').eq('name', 'Cappuccino').single(), 'seed Cappuccino offer');
const community = await campaign(admin, cappuccino.id, 'community', 'COMMUNITY');
const open = await campaign(admin, cappuccino.id, 'open', 'OPEN');
const learner = await student('learner');
const preLaunchLearner = await student('pre-launch-active');

// Pre-cutover redemption is intentionally excluded. Its active claim counts
// after cutover only when redemption itself happens after activation.
const pre = await must(claim(learner.db, community), 'pre-cutover claim');
eq(await must(cafe.rpc('redeem_claim', { p_token: pre[0].redemption_token }), 'pre-cutover redemption'), 'REDEEMED', 'pre-cutover Core redemption succeeds');
eq((await must(service.from('impact_reciprocity_redemptions').select('id').eq('claim_id', pre[0].claim_id), 'pre-cutover accounting')).length, 0, 'pre-cutover redemption has no accounting row');
const preLaunchClaim = await must(claim(preLaunchLearner.db, community), 'pre-cutover active claim');
await must(admin.rpc('admin_activate_impact_reciprocity_policy'), 'activate policy once');
check((await admin.rpc('admin_activate_impact_reciprocity_policy')).error?.message.includes('IMPACT_POLICY_ALREADY_ACTIVATED'), 'policy activation is one-time');

eq(await must(cafe.rpc('redeem_claim', { p_token: preLaunchClaim[0].redemption_token }), 'post-cutover pre-launch redemption'), 'REDEEMED', 'pre-launch active COMMUNITY claim counts at redemption');
const state1 = await must(service.from('impact_reciprocity_state').select('*').eq('student_id', preLaunchLearner.id).single(), 'first state');
eq(state1.community_redemption_count, 1, 'COMMUNITY counts from zero to one');

const openLearner = await student('open');
const openClaim = await must(claim(openLearner.db, open), 'open claim');
eq(await must(cafe.rpc('redeem_claim', { p_token: openClaim[0].redemption_token }), 'open redemption'), 'REDEEMED', 'OPEN redemption succeeds');
eq((await must(service.from('impact_reciprocity_state').select('student_id').eq('student_id', openLearner.id), 'open state')).length, 0, 'OPEN does not initialize reciprocity state');
eq((await must(service.from('impact_reciprocity_redemptions').select('outcome').eq('claim_id', openClaim[0].claim_id).single(), 'open evidence')).outcome, 'open_excluded', 'OPEN exclusion is append-only evidence');

check((await learner.db.from('impact_reciprocity_redemptions').insert({ claim_id: crypto.randomUUID() })).error, 'direct redemption accounting write is rejected');
check((await learner.db.rpc('_impact_has_reasonable_supply', { p_student_id: learner.id, p_at: new Date().toISOString() })).error, 'private supply helper is not executable');
console.log(`PASS: ${assertions} focused Impact Batch 4 hosted assertions (${run})`);
