// Local QA safety check, not a substitute for isolated credentials or approval.
export function requireHostedQaTarget(env = process.env) {
  function block(reason) {
    // Do not include supplied URLs, project references, or credentials.
    throw new Error(`QA target blocked: ${reason}`);
  }

  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') {
    block('Production execution is not permitted.');
  }
  if (env.CI) block('Hosted QA scripts must not run in CI.');
  if (env.CINSTE_HOSTED_QA_VALIDATION !== '1') {
    block('Set CINSTE_HOSTED_QA_VALIDATION=1 only for an approved DEV/QA run.');
  }

  const refs = (env.CINSTE_QA_PROJECT_REFS ?? '').split(',');
  if (!refs.every((ref) => /^[a-z0-9]{20}$/.test(ref))) {
    block('Set CINSTE_QA_PROJECT_REFS to comma-separated DEV/QA project references.');
  }
  // Match the raw input. URL normalization can hide credentials, ports,
  // encoded hosts, whitespace, or path traversal. Custom domains are not allowed.
  const match = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  if (!match || !refs.includes(match[1])) {
    block('The Supabase URL must identify an allow-listed DEV/QA project.');
  }
  return env.NEXT_PUBLIC_SUPABASE_URL;
}
