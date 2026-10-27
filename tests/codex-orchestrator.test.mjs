import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

test('orchestrator registry has one complete low-risk bootstrap task', async () => {
  const registry = JSON.parse(await readFile(join(root, '.ai-kit', 'orchestrator.json'), 'utf8'));
  const bootstrap = registry.tasks.find((task) => task.id === 'ORCH-001');
  assert.equal(bootstrap?.status, 'complete');
  assert.equal(bootstrap?.risk, 'low');
});

test('orchestrator keeps sensitive P0 work review-gated', async () => {
  const registry = JSON.parse(await readFile(join(root, '.ai-kit', 'orchestrator.json'), 'utf8'));
  assert.ok(registry.tasks.filter((task) => task.id.startsWith('P0-') && task.risk !== 'low').length >= 2);
});

test('orchestrator state starts idle and has no task selected', async () => {
  const state = JSON.parse(await readFile(join(root, '.ai-kit', 'orchestrator-state.json'), 'utf8'));
  assert.equal(state.status, 'idle');
  assert.equal(state.current_task, null);
});
