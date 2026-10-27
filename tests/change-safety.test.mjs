import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const gate = fileURLToPath(new URL('../scripts/safety-gate.mjs', import.meta.url));
function repository(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cinste-safety-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const put = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
  git('init', '-q'); git('config', 'user.email', 'gate@example.invalid'); git('config', 'user.name', 'Gate Test');
  put('supabase/migrations/0001_initial.sql', 'select 1;');
  put('plain.ts', 'export const value = 1;');
  git('add', '.'); git('commit', '-qm', 'baseline');
  return { dir, git, put, base: git('rev-parse', 'HEAD') };
}

const safety = () => import('../scripts/lib/change-safety.mjs');

function cli(repo, phase, extra = []) {
  return spawnSync(process.execPath, [gate, phase, '--base', repo.base, '--contract', 'contract.json', ...extra], {
    cwd: repo.dir, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' },
  });
}

function prepareMerge(repo, script = 'node -e "process.exit(0)"') {
  const scripts = Object.fromEntries(['typecheck', 'test', 'test:change-safety', 'test:scheduler', 'test:provisioning', 'test:funding', 'test:native-giver-bff'].map(name => [name, script]));
  repo.put('package.json', JSON.stringify({ private: true, scripts }));
  repo.put('apps/mobile/package.json', JSON.stringify({ private: true, scripts }));
  repo.put('contract.json', JSON.stringify({ action: 'development', paths: ['package.json', 'apps/', 'contract.json', 'plain.ts'] }));
  repo.git('add', '.'); repo.git('commit', '-qm', 'gate fixture');
}

test('CLI merge runs validations and binds readiness to the exact clean head', t => {
  const repo = repository(t); prepareMerge(repo);
  const result = cli(repo, 'merge');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mergeReady, true); assert.equal(report.head, repo.git('rev-parse', 'HEAD'));
  assert.equal(report.validation.length, 9); assert.ok(report.validation.every(item => item.status === 'passed'));
});

for (const flag of ['assume-unchanged', 'skip-worktree']) {
  for (const path of ['plain.ts', 'supabase/migrations/0001_initial.sql']) {
    for (const modified of [false, true]) {
      test(`CLI check and merge deny ${flag} on ${path} (modified=${modified}) without changing flags`, t => {
        const repo = repository(t); prepareMerge(repo);
        repo.git('update-index', `--${flag}`, path);
        if (modified) repo.put(path, 'select 999;');
        // Git itself reports a clean tree, including the out-of-scope migration.
        assert.equal(repo.git('status', '--porcelain'), '');
        const flags = repo.git('ls-files', '-v', '-z');
        for (const phase of ['check', 'merge']) {
          const result = cli(repo, phase);
          assert.notEqual(result.status, 0, result.stdout);
          assert.match(result.stderr, /index flag/i);
          assert.ok(result.stderr.includes(path), result.stderr);
          assert.doesNotMatch(result.stdout, /"mergeReady": true/);
          assert.equal(repo.git('ls-files', '-v', '-z'), flags);
        }
      });
    }
  }
}

test('CLI fails closed on validation failure or changes made by validation', t => {
  for (const script of ['node -e "process.exit(7)"', 'node -e "require(\'fs\').writeFileSync(\'plain.ts\', \'changed\')"']) {
    const repo = repository(t); prepareMerge(repo, script);
    const result = cli(repo, 'merge');
    assert.notEqual(result.status, 0); assert.doesNotMatch(result.stdout, /"mergeReady": true/);
    assert.match(result.stderr, /validation|changed/i);
  }
});

for (const flag of ['assume-unchanged', 'skip-worktree']) {
  for (let command = 1; command <= 9; command += 1) {
    test(`CLI merge denies ${flag} and a hidden migration edit after validation command ${command}`, t => {
      const repo = repository(t);
      const runner = join(repo.dir, 'validator.cjs').replaceAll('\\', '/');
      prepareMerge(repo, `node "${runner}"`);
      repo.put('validator.cjs', `
        const fs = require('node:fs');
        const { execFileSync } = require('node:child_process');
        const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
        const counter = require('node:path').join(root, '.git', 'validation-count');
        const count = (fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0) + 1;
        fs.writeFileSync(counter, String(count));
        if (count === ${command}) {
          const path = 'supabase/migrations/0001_initial.sql';
          execFileSync('git', ['update-index', '--${flag}', path], { cwd: root });
          fs.writeFileSync(require('node:path').join(root, path), 'select 999;');
        }
      `);
      repo.put('contract.json', JSON.stringify({ action: 'development', paths: ['package.json', 'apps/', 'contract.json', 'validator.cjs'] }));
      repo.git('add', '.'); repo.git('commit', '-qm', 'validation mutation fixture');
      const result = cli(repo, 'merge');
      assert.notEqual(result.status, 0, result.stdout);
      assert.match(result.stderr, /index flag/i);
      assert.doesNotMatch(result.stdout, /"mergeReady": true/);
      // Stop at the first unsafe command, rather than letting later tests repair it.
      assert.equal(Number(readFileSync(join(repo.dir, '.git', 'validation-count'), 'utf8')), command);
      assert.equal(repo.git('status', '--porcelain'), '');
      const flags = repo.git('ls-files', '-v', '-z');
      assert.match(cli(repo, 'check').stderr, /index flag/i);
      assert.match(cli(repo, 'merge').stderr, /index flag/i);
      assert.equal(repo.git('ls-files', '-v', '-z'), flags);
    });
  }
}

for (const flag of ['assume-unchanged', 'skip-worktree']) {
  test(`CLI merge denies flag-only ${flag} mutation even after failed validation`, t => {
    const repo = repository(t);
    prepareMerge(repo, `git update-index --${flag} plain.ts && node -e "process.exit(7)"`);
    const result = cli(repo, 'merge');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index flag/i);
    assert.doesNotMatch(result.stdout, /"mergeReady": true/);
    assert.match(cli(repo, 'check').stderr, /index flag/i);
  });
}

test('CLI merge denies a dirty tree, unknown flags, malformed contracts and live actions', t => {
  const repo = repository(t); prepareMerge(repo); repo.put('plain.ts', 'changed');
  assert.match(cli(repo, 'merge').stderr, /clean/i);
  assert.notEqual(cli(repo, 'check', ['--skip-security']).status, 0);
  repo.put('contract.json', '{'); assert.notEqual(cli(repo, 'delegate').status, 0);
  repo.put('contract.json', JSON.stringify({ action: 'apply-migration', paths: ['supabase/'] }));
  assert.match(cli(repo, 'delegate').stderr, /owner approval/i);
});

test('delegation detects every protected path family', async () => {
  let safety;
  try { safety = await import('../scripts/lib/change-safety.mjs'); }
  catch (error) { assert.fail(`Safety gate is missing: ${error.code}`); }
  const report = safety.planDelegation({ action: 'development', paths: [
    'supabase/migrations/', 'lib/auth/', 'lib/payments/', 'scripts/expire-stale-claims.mjs',
    'app/account/delete/', 'apps/mobile/lib/deep-link.ts',
  ] });
  for (const category of ['migration', 'rls', 'rpc', 'auth', 'payment', 'scheduler', 'deletion', 'deep-link']) {
    assert.ok(report.categories.includes(category), category);
  }
  assert.equal(report.securityReviewRequired, true);
});

test('scope rejects invalid paths and all non-development actions', async () => {
  const { planDelegation } = await safety();
  for (const path of ['', '.', '../lib/', '/lib/', 'C:/lib/', 'lib\\auth.ts', 'lib/*', 'lib//auth.ts']) {
    assert.throws(() => planDelegation({ action: 'development', paths: [path] }));
  }
  for (const action of [undefined, 'production', 'deploy', 'apply-migration', 'payment', 'reset-fixtures', 'activate-scheduler']) {
    assert.throws(() => planDelegation({ action, paths: ['lib/'] }));
  }
  assert.throws(() => planDelegation({ action: 'development', paths: [] }));
});

test('content detection catches sensitive code in an unrelated filename', async () => {
  const { classify } = await safety();
  for (const [category, text] of Object.entries({ rls: 'alter table x enable row level security',
    rpc: 'client.rpc("x")', auth: 'client.auth.getUser()', payment: 'confirm_mock_payment()',
    scheduler: 'cron.schedule()', deletion: 'client.from("x").delete()', 'deep-link': 'redirectTo: callback' })) {
    assert.ok(classify('plain.ts', text).includes(category), category);
  }
});

test('inspection includes committed, staged, unstaged and untracked changes', async t => {
  const repo = repository(t);
  repo.put('committed.ts', 'client.rpc("x");'); repo.git('add', '.'); repo.git('commit', '-qm', 'feature');
  repo.put('staged.ts', 'client.auth.getUser();'); repo.git('add', 'staged.ts');
  repo.put('plain.ts', 'cron.schedule();'); repo.put('new.ts', 'client.delete();');
  const { inspectChanges } = await safety();
  const report = inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['committed.ts', 'staged.ts', 'plain.ts', 'new.ts'] } });
  assert.deepEqual(report.paths, ['committed.ts', 'new.ts', 'plain.ts', 'staged.ts']);
  assert.ok(report.categories.includes('rpc')); assert.ok(report.categories.includes('auth'));
  assert.ok(report.categories.includes('scheduler')); assert.ok(report.categories.includes('deletion'));
  assert.equal(report.clean, false);
});

test('scope rejects sibling prefixes and rename destinations', async t => {
  const repo = repository(t); const { inspectChanges } = await safety();
  repo.put('library/file.ts', 'select 1;');
  assert.throws(() => inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['lib/'] } }), /scope/i);
  repo.git('clean', '-fd'); repo.git('mv', 'plain.ts', 'moved.ts');
  assert.throws(() => inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['plain.ts'] } }), /scope/i);
});

test('historical migration edit, delete and rename fail closed', async t => {
  const { inspectChanges } = await safety();
  for (const action of ['edit', 'delete', 'rename']) {
    const repo = repository(t); const path = 'supabase/migrations/0001_initial.sql';
    if (action === 'edit') repo.put(path, 'select 2;');
    if (action === 'delete') repo.git('rm', path);
    if (action === 'rename') repo.git('mv', path, 'supabase/migrations/0002_renamed.sql');
    assert.throws(() => inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['supabase/'] } }), /immutable/i);
  }
});

test('new migrations must use the next unique ordered number', async t => {
  const { inspectChanges } = await safety();
  for (const path of ['0001_duplicate.sql', '0003_gap.sql', 'bad.sql', '0002_BAD.sql']) {
    const repo = repository(t); repo.put(`supabase/migrations/${path}`, 'select 2;');
    assert.throws(() => inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['supabase/'] } }), /migration/i);
  }
  const repo = repository(t); repo.put('supabase/migrations/0002_next.sql', 'select 2;');
  const report = inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['supabase/'] } });
  assert.ok(report.categories.includes('migration')); assert.equal(report.mergeReady, false);
});

test('staged security content cannot be hidden by a benign worktree rewrite', async t => {
  const repo = repository(t); const { inspectChanges } = await safety();
  repo.put('plain.ts', 'client.auth.getUser();'); repo.git('add', 'plain.ts');
  repo.put('plain.ts', 'export const value = 2;');
  const report = inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['plain.ts'] } });
  assert.ok(report.categories.includes('auth'));
});

test('all delegation requires automated review, including broad directory contracts', async () => {
  const { planDelegation, classify } = await safety();
  assert.equal(planDelegation({ action: 'development', paths: ['app/'] }).securityReviewRequired, true);
  assert.ok(classify('apps/mobile/app.json').includes('deep-link'));
});

test('CLI audit catches migration edits without claiming a task scope check', t => {
  const repo = repository(t);
  repo.put('app/offers/[id]/page.tsx', 'export default function Page() {}');
  const run = () => spawnSync(process.execPath, [gate, 'audit', '--base', repo.base], { cwd: repo.dir, encoding: 'utf8' });
  assert.equal(JSON.parse(run().stdout).scopeChecked, false);
  repo.put('supabase/migrations/0001_initial.sql', 'select 2;');
  const denied = run(); assert.notEqual(denied.status, 0); assert.match(denied.stderr, /immutable/i);
});

test('index symlinks fail closed even on hosts that check them out as plain files', async t => {
  const repo = repository(t); const { inspectChanges } = await safety();
  const hash = repo.git('hash-object', '-w', 'plain.ts');
  repo.git('update-index', '--cacheinfo', `120000,${hash},plain.ts`);
  assert.throws(() => inspectChanges({ cwd: repo.dir, base: repo.base, contract: { action: 'development', paths: ['plain.ts'] } }), /symlink|mode/i);
});

test('non-ancestor bases fail closed', async t => {
  const repo = repository(t); const { inspectChanges } = await safety();
  repo.put('plain.ts', 'different'); repo.git('add', '.'); repo.git('commit', '-qm', 'sibling');
  const sibling = repo.git('rev-parse', 'HEAD'); repo.git('checkout', '--detach', repo.base);
  assert.throws(() => inspectChanges({ cwd: repo.dir, base: sibling, contract: { action: 'development', paths: ['plain.ts'] } }));
});

test('missing or invalid base fails instead of inspecting an empty change set', async t => {
  const repo = repository(t); const { inspectChanges } = await safety();
  for (const base of [undefined, 'not-a-ref', '--help']) {
    assert.throws(() => inspectChanges({ cwd: repo.dir, base, contract: { action: 'development', paths: ['plain.ts'] } }));
  }
});
