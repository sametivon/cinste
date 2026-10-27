import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const registryPath = join(root, '.ai-kit', 'orchestrator.json');
const statePath = join(root, '.ai-kit', 'orchestrator-state.json');
const runDir = join(root, '.ai-kit', 'runs');

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

  const dirty = changedPaths();
  if (dirty.length) throw new Error(`Tracked changes exist. Reconcile before delegation: ${dirty.join(', ')}`);

  const runId = randomUUID();
  const worktree = join(runDir, runId, 'worktree');
  const logPath = join(runDir, `${runId}.log`);
  mkdirSync(dirname(worktree), { recursive: true });
  mkdirSync(runDir, { recursive: true });
  state.run_id = runId;
  state.current_task = task.id;
  state.status = 'running';
  state.attempts += 1;
  save(statePath, state);

  const worktreeResult = spawnSync('git', ['worktree', 'add', '--detach', worktree, 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (worktreeResult.status !== 0) throw new Error(worktreeResult.stderr.trim() || 'Could not create isolated worktree.');
  const worker = spawnSync('codex', ['exec', '--cd', worktree, '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '--output-last-message', logPath, promptFor(task)], { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  const workerStatus = worker.status ?? 1;
  const result = workerStatus === 0 ? 'worker_completed_review_required' : `worker_failed_${workerStatus}`;
  state.status = workerStatus === 0 ? 'review_required' : 'retryable_failure';
  state.last_result = result;
  state.history.push({ run_id: runId, task_id: task.id, result, log: logPath });
  save(statePath, state);
  spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: root, encoding: 'utf8' });
  console.log(`${state.status.toUpperCase()} ${task.id} ${runId}`);
  process.exitCode = workerStatus;
}

main();
