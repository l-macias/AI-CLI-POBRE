import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { AgentStepExecutor } from '../agent/AgentStepExecutor.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';
import type { JsonObject } from '../types/SharedTypes.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/security-approval-bypass-regression-test/project');
  const runtimeRoot = resolve('.runtime/security-approval-bypass-regression-test/runtime');
  const statePath = resolve(runtimeRoot, 'state.json');
  const reportPath = resolve(runtimeRoot, 'report.md');
  const targetFile = 'src/index.ts';

  await resetFixture(fixtureRoot);

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
    objective: 'Test approval replay protection for patch application.',
    projectRoot: fixtureRoot,
    projectName: 'Security Approval Bypass Regression Fixture',
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
  state = await executor.execute(state, 'agent-action-request_approval');

  const approvalId = state.approvals[0]?.id;

  if (!approvalId) {
    throw new Error('Expected approval id.');
  }

  state = await executor.approve(state, approvalId, 'Approve original proposal snapshot.');

  const approvedMetadata = state.approvals[0]?.metadata;

  assert(
    typeof approvedMetadata?.['proposalFingerprint'] === 'string',
    'Approval metadata must include proposalFingerprint.',
  );

  const tamperedState = tamperProposalAfterApproval(state);

  const blocked = await executor.execute(tamperedState, 'agent-action-apply_patch');

  assert(
    blocked.actions.some((action) => {
      return action.id === 'agent-action-apply_patch' && action.status === 'blocked';
    }),
    'Tampered proposal must not be applied with old approval.',
  );

  assert(
    blocked.issues.some((issue) => issue.code === 'AGENT_APPROVAL_PATCH_SNAPSHOT_MISMATCH'),
    'Tampered proposal should produce approval snapshot mismatch issue.',
  );

  const finalContent = await readFile(resolve(fixtureRoot, targetFile), 'utf8');

  assert(
    finalContent === 'export const value = 1;\n',
    'Approval replay attempt must not modify target file.',
  );

  const storedRaw = await readFile(statePath, 'utf8');
  const reportRaw = await readFile(reportPath, 'utf8');

  assert(
    storedRaw.includes('AGENT_APPROVAL_PATCH_SNAPSHOT_MISMATCH'),
    'State should persist approval snapshot mismatch issue.',
  );
  assert(
    reportRaw.includes('AGENT_APPROVAL_PATCH_SNAPSHOT_MISMATCH'),
    'Report should include approval snapshot mismatch issue.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-approval-bypass-regression-test',
        approvalId,
        blockedIssues: blocked.issues.map((issue) => issue.code),
      },
      null,
      2,
    ),
  );
}

function tamperProposalAfterApproval<TState extends { metadata?: JsonObject | undefined }>(
  state: TState,
): TState {
  const metadata = state.metadata ?? {};
  const repairExecution = asRecord(metadata['execution_request_repair_proposal']);
  const proposal = asRecord(repairExecution['proposal']);
  const operations = Array.isArray(proposal['operations']) ? proposal['operations'] : [];
  const firstOperation = asRecord(operations[0]);

  const tamperedOperation = {
    ...firstOperation,
    newContent: 'export const value = 999;\n',
    reason: 'Tampered proposal after approval.',
  };

  const tamperedProposal = {
    ...proposal,
    id: 'tampered-after-approval-proposal',
    summary: 'Tampered proposal after approval.',
    operations: [tamperedOperation],
    explanation: 'This proposal was modified after approval and must be blocked.',
  };

  const tamperedRepairExecution = {
    ...repairExecution,
    proposalId: 'tampered-after-approval-proposal',
    proposal: tamperedProposal,
  };

  return {
    ...state,
    metadata: {
      ...metadata,
      execution_request_repair_proposal: tamperedRepairExecution,
    },
  };
}

async function resetFixture(fixtureRoot: string): Promise<void> {
  await rm(resolve('.runtime/security-approval-bypass-regression-test'), {
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
        name: 'security-approval-bypass-regression-fixture',
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
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'security-approval-bypass-regression-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
