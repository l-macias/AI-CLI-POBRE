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

const fixtureRoot = resolve('.runtime/agent-patch-apply-test/project');
const runtimeRoot = resolve('.runtime/agent-patch-apply-test/runtime');
const statePath = resolve(runtimeRoot, 'state.json');
const reportPath = resolve(runtimeRoot, 'report.md');
const targetFile = 'src/index.ts';

await rm(resolve('.runtime/agent-patch-apply-test'), {
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
      name: 'agent-patch-apply-fixture',
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

await writeFile(resolve(fixtureRoot, targetFile), 'export const value = 1;\n', 'utf8');

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

await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
  cwd: fixtureRoot,
  windowsHide: true,
});

await execFileAsync('git', ['config', 'core.eol', 'lf'], {
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
  objective: 'Apply an approval-gated patch for src/index.ts',
  projectRoot: fixtureRoot,
  projectName: 'Agent Patch Apply Fixture',
  targetFiles: [targetFile],
});

const executor = new AgentStepExecutor({
  store,
  reporter,
});

state = await executor.execute(state, 'agent-action-inspect_project');
state = await executor.execute(state, 'agent-action-validate_project');
state = await executor.execute(state, 'agent-action-check_git');
state = await executor.execute(state, 'agent-action-request_repair_proposal');
state = await executor.execute(state, 'agent-action-show_diff_preview');

const blockedBeforeApproval = await executor.execute(state, 'agent-action-apply_patch');

assert(
  blockedBeforeApproval.issues.some((issue) => issue.code === 'AGENT_APPROVAL_REQUIRED'),
  'Expected patch apply to require approval.',
);

state = await executor.execute(state, 'agent-action-request_approval');

const approvalId = state.approvals[0]?.id;

if (!approvalId) {
  throw new Error('Expected approval id.');
}

state = await executor.approve(state, approvalId, 'Approve controlled patch application test.');

state = await executor.execute(state, 'agent-action-apply_patch');

assert(
  state.actions.some(
    (action) => action.id === 'agent-action-apply_patch' && action.status === 'executed',
  ),
  'Expected apply_patch to execute after approval.',
);

const finalContent = await readFile(resolve(fixtureRoot, targetFile), 'utf8');

assert(finalContent === 'export const value = 1;\n', 'Expected fake provider echo patch content.');

const patchApplySummary = state.metadata?.['execution_apply_patch'];

if (typeof patchApplySummary !== 'object' || patchApplySummary === null) {
  throw new Error('Expected patch apply summary metadata.');
}

const storedRaw = await readFile(statePath, 'utf8');
const reportRaw = await readFile(reportPath, 'utf8');

assert(storedRaw.includes('"execution_apply_patch"'), 'Expected patch apply metadata in state.');
assert(storedRaw.includes('"status": "applied"'), 'Expected applied patch result in state.');
assert(reportRaw.includes('apply_patch'), 'Expected apply_patch in report.');

console.log(
  JSON.stringify(
    {
      message: 'Agent patch apply test completed',
      finalContent,
      applyAction: state.actions.find((action) => action.id === 'agent-action-apply_patch'),
      patchApplySummary,
      statePath,
      reportPath,
    },
    null,
    2,
  ),
);
