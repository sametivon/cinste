import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inspectChanges, planDelegation } from './lib/change-safety.mjs';

// These commands are local tests only. Never add hosted runners here.
const validationCommands = [
  ['run', 'test:change-safety'],
  ['run', 'typecheck'], ['test'],
  ['--prefix', 'apps/mobile', 'run', 'typecheck'], ['--prefix', 'apps/mobile', 'test'],
  ['run', 'test:scheduler'], ['run', 'test:provisioning'],
  ['run', 'test:funding'], ['run', 'test:native-giver-bff'],
];

try {
  const [phase, ...args] = process.argv.slice(2);
  if (!['delegate', 'check', 'audit', 'merge'].includes(phase)) throw new Error('Use delegate, check, audit, or merge.');
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]; const value = args[index + 1];
    if (!['--base', '--contract'].includes(name) || !value || value.startsWith('--') || options[name]) throw new Error('Invalid or duplicate option.');
    options[name] = value;
  }
  let contract;
  if (phase === 'audit') {
    if (options['--contract']) throw new Error('Audit reports changes without a delegation scope contract.');
    // CI enforces migration invariants. Only check/merge enforce a task scope.
    const entries = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    contract = { action: 'development', paths: [...new Set(entries.concat('supabase/migrations/'))] };
    // Include removed paths so audit checks historical deletion as well.
    if (options['--base'] && !options['--base'].startsWith('-')) {
      const removed = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', options['--base'], '--'], { encoding: 'utf8' }).split('\0').filter(Boolean);
      contract.paths.push(...removed);
    }
  } else {
    if (!options['--contract']) throw new Error('Supply --contract with a development path contract.');
    contract = JSON.parse(readFileSync(options['--contract'], 'utf8'));
  }
  let report = phase === 'delegate' ? planDelegation(contract)
    : inspectChanges({ base: options['--base'], contract });
  if (phase === 'audit') report = { ...report, phase: 'audit', scopeChecked: false };
  if (phase === 'merge') {
    if (!report.clean) throw new Error('Merge validation requires a clean committed working tree.');
    const npmCli = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (!existsSync(npmCli)) throw new Error('Cannot locate npm. Run this gate with npm run safety:gate -- ...');
    const validation = [];
    // Do not forward hosted credentials or deployment variables to child checks.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP|TMPDIR|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|CI)$/i.test(key)));
    env.NODE_ENV = 'test';
    for (const args of validationCommands) {
      const result = spawnSync(process.execPath, [npmCli, ...args], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, timeout: 300_000 });
      process.stderr.write(result.stdout || ''); process.stderr.write(result.stderr || '');
      // Inspect after every command, including commands that fail or time out.
      const current = inspectChanges({ base: report.base, contract });
      if (!current.clean || current.head !== report.head) throw new Error('Repository changed during validation. Run the gate again.');
      if (result.error || result.status !== 0) throw new Error(`Validation failed: npm ${args.join(' ')} (exit ${result.status ?? 'unavailable'}).`);
      validation.push({ command: `npm ${args.join(' ')}`, status: 'passed' });
    }
    report = { ...report, phase: 'merge', validation, mergeReady: true };
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // Do not print arbitrary child exceptions, which can contain environment data.
  console.error(`Safety gate denied: ${error.message}`);
  process.exitCode = 1;
}
