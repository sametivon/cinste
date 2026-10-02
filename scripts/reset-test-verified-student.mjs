import { createClient } from '@supabase/supabase-js';

const fixtureEmail = 'verified.student@cinste.test';

function fail(message) {
  console.error(`\nFixture reset blocked: ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') fail('NODE_ENV is production.');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  fail('Supabase URL or server-only service role key is missing.');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) fail(listError.message);

const fixture = listed.users.find((user) => user.email === fixtureEmail);
if (!fixture) fail(`${fixtureEmail} does not exist. Run npm run bootstrap:test-users first.`);
if (fixture.app_metadata?.cinste_test_data !== true) fail(`${fixtureEmail} is not marked CINSTE test data.`);

const { data: claims, error: claimsError } = await supabase
  .from('claims')
  .select('id,campaign_id,status')
  .eq('student_id', fixture.id);
if (claimsError) fail(`could not load fixture claims: ${claimsError.message}`);

const activeByCampaign = new Map();
for (const claim of claims) {
  if (claim.status === 'active') activeByCampaign.set(claim.campaign_id, (activeByCampaign.get(claim.campaign_id) ?? 0) + 1);
}

for (const [campaignId, amount] of activeByCampaign) {
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('quantity_available,quantity_total')
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaign) fail(`could not load active fixture campaign: ${campaignError?.message ?? 'missing campaign'}`);

  const quantityAvailable = Math.min(campaign.quantity_total, campaign.quantity_available + amount);
  const { error: restoreError } = await supabase
    .from('campaigns')
    .update({ quantity_available: quantityAvailable })
    .eq('id', campaignId);
  if (restoreError) fail(`could not release fixture inventory: ${restoreError.message}`);
}

const claimIds = claims.map((claim) => claim.id);
if (claimIds.length) {
  const { error: eventsError } = await supabase.from('redemption_events').delete().in('claim_id', claimIds);
  if (eventsError) fail(`could not remove fixture redemption events: ${eventsError.message}`);

  const { error: deleteError } = await supabase.from('claims').delete().in('id', claimIds).eq('student_id', fixture.id);
  if (deleteError) fail(`could not remove fixture claims: ${deleteError.message}`);
}

console.log(`Reset ${fixtureEmail}: removed ${claimIds.length} marked-fixture claim(s) and released ${[...activeByCampaign.values()].reduce((total, amount) => total + amount, 0)} active reservation(s).`);
