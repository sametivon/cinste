import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rules = {
  migration: /supabase\/migrations(?:\/|$)/i,
  rls: /supabase\/|\brls\b|row.level.security|\bpolicy\b|\bgrant\b|\brevoke\b/i,
  rpc: /supabase\/|\brpc\b|security\s+definer|create\s+(?:or\s+replace\s+)?function/i,
  auth: /auth|session|provision|middleware|supabase|workspace|role|permission|verification/i,
  payment: /payment|funding|checkout|giver.order|webhook|settlement|stripe/i,
  scheduler: /schedul|maintenance|cron|expire|stale.claim/i,
  deletion: /delet|retention|purge|truncate|drop\s+(?:table|schema)|\.remove\s*\(/i,
  'deep-link': /deep.?link|callback|redirect|universal.?link|app.?link|associated.?domain|intentFilters|linking|cinste:\/\/|apps\/mobile\/(?:app\.json|app\.config\.)/i,
  'safety-control': /(?:^|\/)(?:AGENTS\.md|package(?:-lock)?\.json)$|^\.github\/|^\.ai-kit\/|change-safety|safety-gate/i,
};

export function validateContract(contract) {
  if (!contract || contract.action !== 'development') {
    throw new Error('Only development is allowed. Live or irreversible actions require owner approval.');
  }
  if (!Array.isArray(contract.paths) || contract.paths.length === 0) throw new Error('Declare non-empty paths.');
  for (const path of contract.paths) {
    if (typeof path !== 'string' || !path || /[\\\x00-\x1f:*?]/.test(path)
        || path.startsWith('/') || path.split('/').some(part => part === '.' || part === '..')
        || path.includes('//')) throw new Error('Use exact repository-relative paths or directory prefixes ending in /.');
  }
  return contract;
}

export function classify(path, content = '') {
  return Object.entries(rules).filter(([, pattern]) => pattern.test(`${path}\n${content}`)).map(([name]) => name);
}

export function planDelegation(contract) {
  validateContract(contract);
  const categories = [...new Set(contract.paths.flatMap(path => classify(path)))].sort();
  return { phase: 'delegate', paths: contract.paths, categories, securityReviewRequired: true,
    liveActionsAllowed: false, mergeReady: false };
}

export function inspectChanges({ cwd = process.cwd(), base, contract }) {
  validateContract(contract);
  if (typeof base !== 'string' || !base || base.startsWith('-')) throw new Error('Supply a valid base commit.');
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  if (resolve(git('rev-parse', '--show-toplevel').trim()) !== resolve(cwd)) throw new Error('Run from the repository root.');
  const baseCommit = git('rev-parse', '--verify', `${base}^{commit}`).trim();
  git('merge-base', '--is-ancestor', baseCommit, 'HEAD');
  const head = git('rev-parse', 'HEAD').trim();
  const split = text => text.split('\0').filter(Boolean);
  // These flags suppress tracked worktree changes in both diff and status.
  // Reject even unchanged entries; never clear operator-owned index flags.
  for (const entry of split(git('ls-files', '-v', '-z'))) {
    if (/^[a-zS] /.test(entry)) {
      throw new Error(`Unsafe Git index flag (assume-unchanged or skip-worktree): ${entry.slice(2)}`);
    }
  }
  const paths = [...new Set([
    ...split(git('diff', '--name-only', '--no-renames', '-z', baseCommit, '--')),
    ...split(git('diff', '--cached', '--name-only', '--no-renames', '-z', baseCommit, '--')),
    ...split(git('ls-files', '--others', '--exclude-standard', '-z')),
  ])].sort();
  for (const path of paths) {
    if (!contract.paths.some(scope => scope.endsWith('/') ? path.startsWith(scope) : path === scope)) {
      throw new Error(`Changed path is outside the declared scope: ${path}`);
    }
  }
  const basePaths = new Set(split(git('ls-tree', '-r', '--name-only', '-z', baseCommit)));
  const indexPaths = new Set(split(git('ls-files', '-z')));
  for (const entry of split(git('ls-files', '--stage', '-z'))) {
    const tab = entry.indexOf('\t');
    const path = entry.slice(tab + 1);
    if (paths.includes(path) && !/^100(?:644|755) /.test(entry)) {
      throw new Error(`Symlink, submodule, or unsupported index mode: ${path}`);
    }
  }
  const read = path => {
    const absolute = join(cwd, path);
    // Refuse symlinks, including parent directories, before reading any contents.
    let current = cwd;
    for (const segment of path.split('/')) {
      current = join(current, segment);
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`Symlink is not allowed: ${path}`);
    }
    if (!existsSync(absolute)) return null;
    if (!lstatSync(absolute).isFile()) throw new Error(`Changed path is not a regular file: ${path}`);
    return readFileSync(absolute);
  };
  const categories = new Set();
  const migrationPrefix = 'supabase/migrations/';
  const historical = [...basePaths].filter(path => path.startsWith(migrationPrefix));
  let latest = Math.max(0, ...historical.map(path => Number(path.slice(migrationPrefix.length, migrationPrefix.length + 4))));
  const newMigrations = [];
  for (const path of paths) {
    const content = read(path);
    const before = basePaths.has(path) ? git('show', `${baseCommit}:${path}`) : '';
    const staged = indexPaths.has(path) ? git('show', `:${path}`) : '';
    for (const category of classify(path, `${before}\n${staged}\n${content?.toString('utf8') ?? ''}`)) categories.add(category);
    if (path.startsWith(migrationPrefix)) {
      if (basePaths.has(path)) {
        const original = execFileSync('git', ['show', `${baseCommit}:${path}`], { cwd, maxBuffer: 64 * 1024 * 1024 });
        if (!content || !original.equals(content)) throw new Error(`Historical migration is immutable: ${path}`);
        // Also reject index-only changes hidden by a restored worktree file.
        if (split(git('diff', '--cached', '--name-only', '-z', baseCommit, '--', path)).length) throw new Error(`Historical migration index is immutable: ${path}`);
      } else if (content) newMigrations.push(path);
    }
  }
  for (const path of newMigrations.sort()) {
    const match = /^supabase\/migrations\/(\d{4})_[a-z0-9_]+\.sql$/.exec(path);
    if (!match || Number(match[1]) !== latest + 1) throw new Error(`New migration must use the next unique ordered number: ${path}`);
    latest += 1;
  }
  return { phase: 'check', base: baseCommit, head, paths, categories: [...categories].sort(),
    clean: git('status', '--porcelain', '--untracked-files=all').length === 0,
    securityReviewRequired: true, liveActionsAllowed: false, mergeReady: false };
}
