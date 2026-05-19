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

const fixtureRoot = resolve('.runtime/agent-approval-gate-test/project');
const runtimeRoot = resolve('.runtime/agent-approval-gate-test/runtime');
const statePath = resolve(runtimeRoot, 'state.json');
const reportPath = resolve(runtimeRoot, 'report.md');

await rm(resolve('.runtime/agent-approval-gate-test'), {
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
      name: 'agent-approval-gate-fixture',
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
  objective: 'Prepare approval-gated patch application for src/index.ts',
  projectRoot: fixtureRoot,
  projectName: 'Agent Approval Gate Fixture',
  targetFiles: ['src/index.ts'],
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
  blockedBeforeApproval.actions.some(
    (action) => action.id === 'agent-action-apply_patch' && action.status === 'blocked',
  ),
  'Expected apply_patch to be blocked before approval request.',
);

assert(
  blockedBeforeApproval.issues.some((issue) => issue.code === 'AGENT_APPROVAL_REQUIRED'),
  'Expected approval required issue before approval request.',
);

state = await executor.execute(state, 'agent-action-request_approval');

assert(state.approvals.length === 1, 'Expected one approval request.');
assert(state.approvals[0]?.status === 'pending', 'Expected pending approval.');

const approvalId = state.approvals[0]?.id;

if (!approvalId) {
  throw new Error('Expected approval id.');
}

const rejected = await executor.reject(state, approvalId, 'Rejecting first approval for test.');

assert(rejected.approvals[0]?.status === 'rejected', 'Expected rejected approval.');

const blockedAfterRejection = await executor.execute(rejected, 'agent-action-apply_patch');

assert(
  blockedAfterRejection.issues.some((issue) => issue.code === 'AGENT_APPROVAL_NOT_GRANTED'),
  'Expected approval not granted issue after rejection.',
);

state = await executor.execute(state, 'agent-action-request_approval');

assert(state.approvals.length === 2, 'Expected second approval request.');

const secondApprovalId = state.approvals[1]?.id;

if (!secondApprovalId) {
  throw new Error('Expected second approval id.');
}

const approved = await executor.approve(
  state,
  secondApprovalId,
  'Approve for gated readiness test.',
);

assert(approved.approvals[1]?.status === 'approved', 'Expected approved approval.');

const storedRaw = await readFile(statePath, 'utf8');
const reportRaw = await readFile(reportPath, 'utf8');

assert(storedRaw.includes('"approvals"'), 'Expected approvals in state.');
assert(storedRaw.includes('"approved"'), 'Expected approved state persisted.');
assert(reportRaw.includes('## Approvals'), 'Expected approvals report section.');
assert(reportRaw.includes('patch_apply'), 'Expected patch approval scope in report.');

console.log(
  JSON.stringify(
    {
      message: 'Agent approval gate test completed',
      approvals: approved.approvals.map((approval) => ({
        id: approval.id,
        status: approval.status,
        scope: approval.scope,
      })),
      issues: approved.issues.map((issue) => issue.code),
      statePath,
      reportPath,
    },
    null,
    2,
  ),
);
