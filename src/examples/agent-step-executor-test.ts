import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { AgentStepExecutor } from '../agent/AgentStepExecutor.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureRoot = resolve('.runtime/agent-step-executor-test/project');
const runtimeRoot = resolve('.runtime/agent-step-executor-test/runtime');
const statePath = resolve(runtimeRoot, 'state.json');
const reportPath = resolve(runtimeRoot, 'report.md');

await rm(resolve('.runtime/agent-step-executor-test'), {
  recursive: true,
  force: true,
});

await mkdir(resolve(fixtureRoot, 'src'), {
  recursive: true,
});

await writeFile(
  resolve(fixtureRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'agent-step-executor-fixture',
      scripts: {
        typecheck: 'tsc --noEmit',
      },
      devDependencies: {
        typescript: '^5.7.2',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(
  resolve(fixtureRoot, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(resolve(fixtureRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

await execFileAsync('git', ['init', '-b', 'test-branch'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

await writeFile(resolve(fixtureRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

await execFileAsync('git', ['add', '.'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

await execFileAsync('git', ['commit', '-m', 'initial commit'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

const store = new AgentLoopStateStore({
  outputPath: statePath,
});

const reporter = new AgentLoopReporter({
  outputPath: reportPath,
});

const loop = new InteractiveAgentLoop({
  store,
  reporter,
});

let state = await loop.start({
  objective: 'Inspect, validate, and request a repair proposal for src/index.ts',
  projectRoot: fixtureRoot,
  projectName: 'Agent Step Executor Fixture',
  targetFiles: ['src/index.ts'],
});

const executor = new AgentStepExecutor({
  store,
  reporter,
});

state = await executor.execute(state, 'agent-action-inspect_project');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-inspect_project' && action.status === 'executed',
  ),
  'Expected inspect_project to execute.',
);

state = await executor.execute(state, 'agent-action-validate_project');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-validate_project' && action.status === 'executed',
  ),
  'Expected validate_project to execute.',
);

state = await executor.execute(state, 'agent-action-check_git');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-check_git' && action.status === 'executed',
  ),
  'Expected check_git to execute.',
);

state = await executor.execute(state, 'agent-action-request_repair_proposal');

assert(
  state.actions.some(
    (action) =>
      action.id === 'agent-action-request_repair_proposal' && action.status === 'executed',
  ),
  'Expected request_repair_proposal to execute.',
);

state = await executor.execute(state, 'agent-action-show_diff_preview');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-show_diff_preview' && action.status === 'executed',
  ),
  'Expected show_diff_preview to execute.',
);

state = await executor.execute(state, 'agent-action-apply_patch');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-apply_patch' && action.status === 'blocked',
  ),
  'Expected apply_patch to be blocked in 39.B.',
);

assert(
  state.issues.some((issue) => issue.code === 'AGENT_APPROVAL_REQUIRED'),
  'Expected approval required issue.',
);

const storedRaw = await readFile(statePath, 'utf8');
const reportRaw = await readFile(reportPath, 'utf8');

assert(
  storedRaw.includes('"execution_request_repair_proposal"'),
  'Expected repair execution metadata.',
);
assert(reportRaw.includes('Zero Runtime Agent Loop'), 'Expected agent report.');
assert(reportRaw.includes('request_repair_proposal'), 'Expected repair action in report.');

console.log(
  JSON.stringify(
    {
      message: 'Agent step executor test completed',
      status: state.status,
      executedActions: state.actions.filter((action) => action.status === 'executed').length,
      blockedActions: state.actions.filter((action) => action.status === 'blocked').length,
      issues: state.issues.length,
      statePath,
      reportPath,
    },
    null,
    2,
  ),
);
