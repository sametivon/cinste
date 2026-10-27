import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { requireHostedQaTarget } from '../scripts/lib/qa-target.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const loader = new URL('./helpers/qa-client-loader.mjs', import.meta.url).href;
const scripts = readdirSync(new URL('../scripts/', import.meta.url))
  .filter((name) => name.endsWith('.mjs') && readFileSync(new URL(`../scripts/${name}`, import.meta.url), 'utf8').includes('@supabase/supabase-js'));
const projectRef = 'abcdefghijklmnopqrst';
const base = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'qa-test-public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'qa-test-service-key',
  CINSTE_HOSTED_QA_VALIDATION: '1',
  CINSTE_VALIDATE_0022: '1',
};

function run(script, overrides = {}) {
  // Do not inherit local credentials or deployment environment configuration.
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...base, ...overrides };
  return spawnSync(process.execPath, ['--no-warnings', '--loader', loader, `scripts/${script}`], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
}

const valid = { ...base, CINSTE_QA_PROJECT_REFS: projectRef };
const invalidUrls = [
  '', 'not a URL', `http://${projectRef}.supabase.co`,
  `https://${projectRef}.supabase.co.evil.example`,
  `https://evil.example/${projectRef}.supabase.co`,
  `https://${projectRef}.supabase.co@evil.example`,
  `https://user:private-value@${projectRef}.supabase.co`,
  `https://${projectRef}.supabase.co:443`,
  `https://${projectRef}.supabase.co/path`,
  `https://${projectRef}.supabase.co/?key=private-value`,
  `https://${projectRef}.supabase.co/#fragment`,
  `https://${projectRef}.supabase.co/../`,
  `https://${projectRef}.supabase.co\\\\@evil.example`,
  `https://%61${projectRef.slice(1)}.supabase.co`,
  `https://${projectRef.toUpperCase()}.supabase.co`,
  ` https://${projectRef}.supabase.co`,
  `https://${projectRef}.supabase.co\n`,
  'http://localhost:54321', 'https://qa.example.com',
];
for (const [index, url] of invalidUrls.entries()) {
  test(`reject raw URL variant ${index} without leaking input`, () => {
    assert.throws(() => requireHostedQaTarget({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }), (error) => {
      assert.equal(error.message, 'QA target blocked: The Supabase URL must identify an allow-listed DEV/QA project.');
      return true;
    });
  });
}
for (const refs of ['', '*', `${projectRef},`, ` ${projectRef}`, projectRef.toUpperCase(), `${projectRef}\n`, 'short']) {
  test(`reject malformed allow-list ${JSON.stringify(refs)}`, () => {
    assert.throws(() => requireHostedQaTarget({ ...valid, CINSTE_QA_PROJECT_REFS: refs }), /QA target blocked:/);
  });
}
test('accept exact reference in a multi-project allow-list and optional root slash', () => {
  const url = `${base.NEXT_PUBLIC_SUPABASE_URL}/`;
  assert.equal(requireHostedQaTarget({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url, CINSTE_QA_PROJECT_REFS: `zyxwvutsrqponmlkjihg,${projectRef}` }), url);
});

const denied = [
  ['missing allow-list', {}],
  ['wrong project', { CINSTE_QA_PROJECT_REFS: 'zyxwvutsrqponmlkjihg' }],
  ['missing acknowledgement', { CINSTE_QA_PROJECT_REFS: projectRef, CINSTE_HOSTED_QA_VALIDATION: '' }],
  ['production process', { CINSTE_QA_PROJECT_REFS: projectRef, NODE_ENV: 'production' }],
  ['production deployment', { CINSTE_QA_PROJECT_REFS: projectRef, VERCEL_ENV: 'production' }],
  ['CI execution', { CINSTE_QA_PROJECT_REFS: projectRef, CI: 'true' }],
  ['untrusted URL', { CINSTE_QA_PROJECT_REFS: projectRef, NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co.attacker.example` }],
];

for (const script of scripts) {
  for (const [label, overrides] of denied) {
    test(`${script}: ${label} blocks before client creation`, () => {
      const result = run(script, overrides);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /QA target blocked:/);
      assert.doesNotMatch(result.stderr, /QA_TEST_CLIENT_CREATED/);
    });
  }
  test(`${script}: approved target reaches client creation`, () => {
    const result = run(script, { CINSTE_QA_PROJECT_REFS: projectRef });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /QA_TEST_CLIENT_CREATED/);
    assert.doesNotMatch(result.stderr, /QA target blocked:/);
  });
}
