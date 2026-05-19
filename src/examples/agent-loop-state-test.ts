import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const statePath = resolve('.runtime/agent-loop-state-test/state.json');
const reportPath = resolve('.runtime/agent-loop-state-test/report.md');

await rm(resolve('.runtime/agent-loop-state-test'), {
  recursive: true,
  force: true,
});

const loop = new InteractiveAgentLoop({
  store: new AgentLoopStateStore({
    outputPath: statePath,
  }),
  reporter: new AgentLoopReporter({
    outputPath: reportPath,
  }),
});

const started = await loop.start({
  objective: 'Fix the TypeScript error in src/index.ts',
  projectRoot: '/tmp/zero-agent-loop-test',
  projectName: 'Agent Loop Test Project',
  targetFiles: ['src/index.ts'],
  metadata: {
    includeProjectMemory: true,
  },
});

assert(started.status === 'waiting_for_user', 'Expected loop to wait for user.');
assert(started.turns.length === 2, 'Expected initial user/runtime turns.');
assert(started.actions.length >= 10, 'Expected default action menu.');
assert(started.approvals.length === 0, 'Expected no approvals initially.');
assert(
  started.metadata?.['includeProjectMemory'] === true,
  'Expected project memory preference metadata.',
);
assert(
  started.actions.some((action) => action.kind === 'apply_patch' && action.requiresApproval),
  'Expected apply_patch action to require approval.',
);

const selected = await loop.selectAction(
  started,
  'agent-action-inspect_project',
  'Start with read-only inspection.',
);

assert(selected.status === 'running', 'Expected selected action to move loop to running.');
assert(selected.decisions.length === 1, 'Expected one decision.');
assert(
  selected.actions.some(
    (action) => action.id === 'agent-action-inspect_project' && action.status === 'selected',
  ),
  'Expected inspect action to be selected.',
);

const completed = await loop.complete(selected);

assert(completed.status === 'completed', 'Expected loop to complete.');
assert(completed.completedAt !== undefined, 'Expected completedAt.');

const storedRaw = await readFile(statePath, 'utf8');
const reportRaw = await readFile(reportPath, 'utf8');

assert(storedRaw.includes('"status": "completed"'), 'Expected stored state to be completed.');
assert(storedRaw.includes('"approvals": []'), 'Expected stored approvals array.');
assert(
  storedRaw.includes('"includeProjectMemory": true'),
  'Expected stored project memory preference.',
);
assert(reportRaw.includes('Zero Runtime Agent Loop'), 'Expected markdown report title.');
assert(reportRaw.includes('Fix the TypeScript error'), 'Expected report objective.');
assert(reportRaw.includes('## Approvals'), 'Expected approvals section.');
assert(loop.present(completed).includes('Zero Runtime agent loop'), 'Expected presenter output.');

console.log(
  JSON.stringify(
    {
      message: 'Agent loop state test completed',
      status: completed.status,
      actions: completed.actions.length,
      decisions: completed.decisions.length,
      approvals: completed.approvals.length,
      statePath,
      reportPath,
    },
    null,
    2,
  ),
);
