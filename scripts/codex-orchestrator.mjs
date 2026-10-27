import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const registryPath = join(root, '.ai-kit', 'orchestrator.json');
const statePath = join(root, '.ai-kit', 'orchestrator-state.json');
const runDir = process.env.CINSTE_ORCHESTRATOR_RUN_DIR ?? join(tmpdir(), 'cinste-codex-orchestrator');
const codexLauncher = process.platform === 'win32'
  ? (process.env.CINSTE_CODEX_LAUNCHER ?? join(process.env.APPDATA ?? 'C:\\Users\\Public', 'npm', 'codex.ps1'))
  : 'codex';

const sensitivePathPatterns = [
  /(^|[\\/])supabase[\\/]migrations[\\/]/i,
  /(^|[\\/])(app|lib|components)[\\/].*(auth|role|admin|verification|redemption|fund|payment|checkout|deep|callback)/i,
  /(^|[\\/])apps[\\/]mobile[\\/].*(auth|role|link|callback|payment|fund|verification)/i,
  /(^|[\\/])scripts[\\/].*(reset|bootstrap|hosted|integration|maintenance)/i,
  /(^|[\\/])\.env/i,
  /(^|[\\/])eas\.json$/i,
  /(^|[\\/])vercel\.json$/i,
  /(^|[\\/])\.github[\\/]workflows[\\/]/i,
];

function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function save(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

function readyTask(registry) {
  return registry.tasks
    .filter((task) => task.status === 'planned')
    .filter((task) => task.depends_on.every((id) => registry.tasks.some((candidate) => candidate.id === id && candidate.status === 'complete')))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0] ?? null;
}

function changedPaths() {
  const result = spawnSync('git', ['status', '--short', '--untracked-files=no'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'git status failed');
  return result.stdout.split(/\r?\n/).map((line) => line.slice(3)).filter(Boolean);
}

function requiresReview(task) {
  return task.risk === 'security' || task.risk === 'high' || task.paths.some((path) => sensitivePathPatterns.some((pattern) => pattern.test(path)));
}

function promptFor(task) {
  return [
    `CINSTE task ${task.id}: ${task.title}`,
    task.description,
    'Read AGENTS.md, docs/current/current-state.md, docs/decisions/project.md, and relevant task documents first.',
    `Work only in these paths: ${task.paths.join(', ')}`,
    `Run these validations when applicable: ${task.validation.join('; ')}`,
    'Do not change product authority, security boundaries, credentials, migrations, deployment, or production configuration.',
    'Stop and report a blocker if the task needs a missing product decision or security review.',
    'Return a concise summary of changes, validation, and remaining risk.',
  ].join('\n\n');
}

function report(registry, state, mode) {
  const task = readyTask(registry);
  const result = { mode, status: state.status, current_task: state.current_task, next_task: task?.id ?? null, next_action: task ? (requiresReview(task) ? 'review_required' : 'delegable') : 'stop', tasks: registry.tasks.map(({ id, title, priority, status, risk, depends_on }) => ({ id, title, priority, status, risk, depends_on })) };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function main() {
  const command = process.argv[2] ?? 'status';
  const registry = load(registryPath);
  const state = load(statePath);

  if (command === 'status') return report(registry, state, command);
  if (command === 'plan' || command === 'pilot') {
    const result = report(registry, state, command);
    if (command === 'pilot') {
      const task = readyTask(registry);
      if (task) console.log(`PILOT_READY ${task.id}: ${task.title}`);
    }
    return result;
  }

  if (command !== 'run') throw new Error(`Unknown command: ${command}`);
  const taskId = process.argv.slice(3).find((arg) => arg.startsWith('--task='))?.slice(7);
  const task = taskId ? registry.tasks.find((candidate) => candidate.id === taskId) : readyTask(registry);
  if (!task) throw new Error('No ready task exists.');
  if (task.status !== 'planned') throw new Error(`Task ${task.id} is not planned.`);
  if (requiresReview(task)) {
    state.status = 'review_required';
    state.current_task = task.id;
    state.last_result = 'Task requires owner or security review before unattended execution.';
    save(statePath, state);
    console.log(`REVIEW_REQUIRED ${task.id}`);
    return;
  }

  const maxAttempts = registry.max_retries + 1;
  if (state.current_task === task.id && state.attempts >= maxAttempts) {
    state.status = 'blocked';
    state.last_result = `Retry budget exhausted after ${state.attempts} attempts.`;
    save(statePath, state);
    console.log(`BLOCKED ${task.id}: retry budget exhausted`);
    return;
  }

  const dirty = changedPaths();
  if (dirty.length) throw new Error(`Tracked changes exist. Reconcile before delegation: ${dirty.join(', ')}`);

  const runId = randomUUID();
  const worktree = join(runDir, runId, 'worktree');
  const logPath = join(runDir, `${runId}.log`);
  const lastMessagePath = join(runDir, `${runId}.last-message`);
  const branch = `codex/${task.id.toLowerCase()}-${runId.slice(0, 8)}`;
  mkdirSync(dirname(worktree), { recursive: true });
  mkdirSync(runDir, { recursive: true });
  state.run_id = runId;
  state.current_task = task.id;
  state.status = 'running';
  state.attempts += 1;
  save(statePath, state);

  const worktreeResult = spawnSync('git', ['worktree', 'add', '-b', branch, worktree, 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (worktreeResult.status !== 0) throw new Error(worktreeResult.stderr.trim() || 'Could not create isolated worktree.');
  const codexArgs = process.platform === 'win32'
    ? ['-NoProfile', '-File', codexLauncher, '--approve-for-me', '--no-alt-screen', '--cd', worktree, 'exec', '--output-last-message', lastMessagePath, promptFor(task)]
    : ['--approve-for-me', '--no-alt-screen', '--cd', worktree, 'exec', '--output-last-message', lastMessagePath, promptFor(task)];
  const worker = spawnSync(process.platform === 'win32' ? 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' : codexLauncher, codexArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const workerStatus = worker.status ?? 1;
  const lastMessage = existsSync(lastMessagePath) ? readFileSync(lastMessagePath, 'utf8') : '';
  writeFileSync(logPath, `${worker.error?.message ?? ''}\n${worker.stdout ?? ''}${worker.stderr ?? ''}${lastMessage}`, 'utf8');
  const result = workerStatus === 0 ? 'worker_completed_review_required' : `worker_failed_${workerStatus}`;
  state.status = workerStatus === 0 ? 'review_required' : 'retryable_failure';
  state.last_result = result;
  state.history.push({ run_id: runId, task_id: task.id, result, branch, worktree, log: logPath });
  save(statePath, state);
  if (workerStatus !== 0) spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: root, encoding: 'utf8' });
  console.log(`${state.status.toUpperCase()} ${task.id} ${runId}`);
  process.exitCode = workerStatus;
}

main();
