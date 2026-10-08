import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Deliberately limited to a non-production project. This validates only the
// already-applied 0023 database contract; it neither calls the BFF nor changes
// application data. The one opaque test fingerprint expires through the
// migration's bounded cleanup (at most 48 hours).
if (process.env.NODE_ENV === 'production' || process.env.CINSTE_HOSTED_QA_VALIDATION !== '1') {
  throw new Error('Set CINSTE_HOSTED_QA_VALIDATION=1 for an approved non-production DEV/QA project.');
}

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonymous = createClient(url, publishable, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authenticated = createClient(url, publishable, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const assertions = [];
const subject = createHash('sha256').update(`cinste-hosted-0023-${crypto.randomUUID()}`).digest('hex');

function check(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  assertions.push(message);
}

async function expectsDenied(client, label) {
  const { data, error } = await client.rpc('consume_native_giver_bff_rate_limit', {
    p_scope: 'signup_ip_burst',
    p_subject_hash: subject,
  });
  check(data === null && Boolean(error), `${label} direct function execution is denied`);
}

async function privateStorageIsUnavailable(client, label) {
  const { data, error } = await client
    .schema('cinste_private')
    .from('native_bff_rate_limit_windows')
    .select('scope')
    .limit(1);
  check(data === null && Boolean(error), `${label} cannot read private limiter storage through the API`);
}

const fixtureEmail = process.env.CINSTE_QA_GIVER_EMAIL ?? 'giver@cinste.test';
const fixturePassword = process.env.CINSTE_QA_GIVER_PASSWORD ?? 'cinste-local-2026';

const { data: signIn, error: signInError } = await authenticated.auth.signInWithPassword({
  email: fixtureEmail,
  password: fixturePassword,
});
if (signInError || !signIn.session) {
  throw new Error('Authenticated DEV/QA fixture sign-in failed; no hosted authenticated-role assertion was made.');
}

try {
  await expectsDenied(anonymous, 'Anonymous');
  await expectsDenied(authenticated, 'Authenticated');
  await privateStorageIsUnavailable(anonymous, 'Anonymous');
  await privateStorageIsUnavailable(authenticated, 'Authenticated');
  await privateStorageIsUnavailable(service, 'Service role');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await service.rpc('consume_native_giver_bff_rate_limit', {
      p_scope: 'signup_ip_burst', p_subject_hash: subject,
    });
    check(error === null && data === true, `service-role attempt ${attempt + 1} is allowed within the configured burst quota`);
  }
  const { data: overQuota, error: overQuotaError } = await service.rpc('consume_native_giver_bff_rate_limit', {
    p_scope: 'signup_ip_burst', p_subject_hash: subject,
  });
  check(overQuotaError === null && overQuota === false, 'service-role attempt above the configured burst quota is denied');

  const { data: invalidData, error: invalidError } = await service.rpc('consume_native_giver_bff_rate_limit', {
    p_scope: 'signup_ip_burst', p_subject_hash: 'not-a-64-character-hex-fingerprint',
  });
  check(invalidData === null && Boolean(invalidError), 'non-fingerprint input is rejected before limiter persistence');

  console.log(`PASS: ${assertions.length} hosted non-production 0023 assertions`);
} finally {
  await authenticated.auth.signOut();
}
