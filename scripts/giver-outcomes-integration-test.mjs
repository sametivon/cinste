import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Giver outcome integration refuses NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `qa-giving-${Date.now()}`;
let assertions = 0;
const createdCampaigns = [];

function check(condition, message) { assertions += 1; if (!condition) throw new Error(`ASSERTION FAILED: ${message}`); }
function eq(actual, expected, message) { check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
async function must(query, message) { const { data, error } = await query; if (error) throw new Error(`${message}: ${error.message}`); return data; }

async function account(label, role = 'student') {
  const email = `${run}.${label}@cinste.test`;
  const password = 'CinsteGivingTest2026!';
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message ?? 'no user'}`);
  await must(service.from('profiles').update({ role }).eq('id', data.user.id), `set ${label} role`);
  return { id: data.user.id, email, password };
}
async function client(user) {
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  await must(db.auth.signInWithPassword({ email: user.email, password: user.password }), `sign in ${user.email}`);
  return db;
}
async function paidItem(giverId, offerId, quantity, suffix) {
  const order = await must(service.from('giver_orders').insert({ giver_id: giverId, status: 'paid', total_bani: quantity * 100, paid_at: new Date().toISOString() }).select('id').single(), `create paid order ${suffix}`);
  const item = await must(service.from('giver_order_items').insert({ order_id: order.id, offer_id: offerId, quantity, unit_price_bani: 100 }).select('id').single(), `create paid item ${suffix}`);
  await must(service.from('payments').insert({ order_id: order.id, provider: 'mock', provider_reference: `${run}-${suffix}`, status: 'succeeded', amount_bani: quantity * 100, confirmed_at: new Date().toISOString() }), `create payment ${suffix}`);
  return { orderId: order.id, itemId: item.id };
}
async function campaign(orderId, offerId, quantity, suffix, values = {}) {
  const row = await must(service.from('campaigns').insert({ offer_id: offerId, giver_order_id: orderId, name: `${run} ${suffix}`, sponsor_type: 'individual', funding_source: 'mock_payment', quantity_total: quantity, quantity_available: quantity, starts_at: new Date(Date.now() - 60_000).toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), claim_expiration_minutes: 60, status: 'active', ...values }).select('id').single(), `create campaign ${suffix}`);
  createdCampaigns.push(row.id);
  return row.id;
}
async function student(label) {
  const user = await account(`student-${label}`);
  await must(service.from('student_profiles').insert({ user_id: user.id, full_name: `QA ${label}`, verification_status: 'verified' }), `create student ${label}`);
  return user;
}
async function addClaim(campaignId, studentId, suffix, status = 'active', expiresAt = new Date(Date.now() + 3_600_000).toISOString()) {
  const claim = await must(service.from('claims').insert({ campaign_id: campaignId, student_id: studentId, token_hash: `${run}-${suffix}`, token_hint: suffix.slice(-6), status, expires_at: expiresAt, redeemed_at: status === 'redeemed' ? new Date().toISOString() : null }).select('id').single(), `create claim ${suffix}`);
  if (status === 'redeemed') await must(service.from('redemption_events').insert({ claim_id: claim.id, partner_id: (await must(service.from('offers').select('partner_id').eq('id', (await must(service.from('campaigns').select('offer_id').eq('id', campaignId).single(), 'claim campaign offer')).offer_id).single(), 'claim partner')).partner_id }), `create redemption ${suffix}`);
  return claim.id;
}

try {
  const offer = await must(service.from('offers').select('id').eq('active', true).limit(1).single(), 'select active offer');
  const giver = await account('owner', 'student');
  const otherGiver = await account('other', 'giver');
  const admin = await account('admin', 'admin');
  const partner = await account('partner', 'partner');
  const giverDb = await client(giver);
  const otherDb = await client(otherGiver);
  const adminDb = await client(admin);
  const partnerDb = await client(partner);
  const students = await Promise.all(['one', 'two', 'three', 'four', 'five'].map(student));

  const eligibleOrder = await paidItem(giver.id, offer.id, 5, 'eligible');
  const eligibleCampaign = await campaign(eligibleOrder.orderId, offer.id, 5, 'eligible', { quantity_available: 1 });
  await addClaim(eligibleCampaign, students[0].id, 'eligible-active');
  for (let index = 1; index < 5; index += 1) await addClaim(eligibleCampaign, students[index].id, `eligible-redeemed-${index}`, 'redeemed');

  const { data: anonymousRows, error: anonymousError } = await createClient(url, publishable).rpc('list_my_giving_outcomes');
  check(Boolean(anonymousError) && !anonymousRows, 'anonymous execution is denied');
  const ownRows = await must(giverDb.rpc('list_my_giving_outcomes'), 'owner outcome RPC');
  const eligible = ownRows.find((row) => row.order_item_id === eligibleOrder.itemId);
  check(Boolean(eligible), 'role-independent authenticated owner sees own outcome');
  eq(Object.keys(eligible).sort(), ['availability_state', 'available_now_quantity', 'funded_quantity', 'offer_title', 'order_id', 'order_item_id', 'outcome_state', 'recorded_unreserved_quantity', 'redeemed_quantity', 'reserved_quantity'].sort(), 'response uses only the reviewed field allowlist');
  eq({ state: eligible.outcome_state, funded: eligible.funded_quantity, reserved: eligible.reserved_quantity, redeemed: eligible.redeemed_quantity, recorded: eligible.recorded_unreserved_quantity, available: eligible.available_now_quantity, availability: eligible.availability_state }, { state: 'available', funded: 5, reserved: 1, redeemed: 4, recorded: 1, available: 1, availability: 'available' }, 'exact eligible aggregates use active reservations and successful redemptions');
  check(!Object.keys(eligible).some((key) => /student|claim|token|time|payment|reference/i.test(key)), 'response excludes identifiers, credentials, timestamps, and payment details');

  const suppressedOrder = await paidItem(giver.id, offer.id, 5, 'suppressed');
  const suppressedCampaign = await campaign(suppressedOrder.orderId, offer.id, 5, 'suppressed', { quantity_available: 3 });
  await addClaim(suppressedCampaign, students[0].id, 'suppressed-one');
  await addClaim(suppressedCampaign, students[0].id, 'suppressed-repeat', 'redeemed');
  const afterSuppression = await must(giverDb.rpc('list_my_giving_outcomes'), 'suppressed outcome RPC');
  const suppressed = afterSuppression.find((row) => row.order_item_id === suppressedOrder.itemId);
  eq({ state: suppressed.outcome_state, reserved: suppressed.reserved_quantity, redeemed: suppressed.redeemed_quantity, recorded: suppressed.recorded_unreserved_quantity, available: suppressed.available_now_quantity, availability: suppressed.availability_state }, { state: 'privacy_suppressed', reserved: null, redeemed: null, recorded: null, available: null, availability: null }, 'small or repeated-student cohorts suppress every complementary activity value');

  const unavailableOrder = await paidItem(giver.id, offer.id, 5, 'duplicate');
  await campaign(unavailableOrder.orderId, offer.id, 5, 'duplicate-one');
  await campaign(unavailableOrder.orderId, offer.id, 5, 'duplicate-two');
  const afterDuplicate = await must(giverDb.rpc('list_my_giving_outcomes'), 'duplicate mapping outcome RPC');
  const unavailable = afterDuplicate.find((row) => row.order_item_id === unavailableOrder.itemId);
  eq({ state: unavailable.outcome_state, funded: unavailable.funded_quantity, reserved: unavailable.reserved_quantity, redeemed: unavailable.redeemed_quantity }, { state: 'unavailable', funded: 5, reserved: null, redeemed: null }, 'ambiguous campaign mapping never receives attributed activity');

  const otherOrder = await paidItem(otherGiver.id, offer.id, 5, 'other');
  await campaign(otherOrder.orderId, offer.id, 5, 'other');
  eq((await must(otherDb.rpc('list_my_giving_outcomes'), 'other giver outcomes')).map((row) => row.order_item_id).includes(eligibleOrder.itemId), false, 'cross-giver isolation holds');
  eq((await must(adminDb.rpc('list_my_giving_outcomes'), 'admin outcomes')).length, 0, 'admin has no bypass');
  eq((await must(partnerDb.rpc('list_my_giving_outcomes'), 'partner outcomes')).length, 0, 'partner has no bypass');
  const override = await giverDb.rpc('list_my_giving_outcomes', { giver_id: otherGiver.id });
  check(Boolean(override.error), 'RPC accepts no caller-supplied giver override');
  console.log(`PASS: ${assertions} giver outcome hosted assertions (${run})`);
} finally {
  if (createdCampaigns.length) await service.from('campaigns').update({ status: 'ended' }).in('id', createdCampaigns);
}
