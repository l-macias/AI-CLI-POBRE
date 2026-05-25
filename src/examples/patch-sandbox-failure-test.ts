import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PatchSandbox } from '../sandbox/PatchSandbox.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function required<TValue>(value: TValue | null | undefined, message: string): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const runtimeRoot = '.runtime/patch-sandbox-failure-test';
const projectRoot = resolve(runtimeRoot, 'project');

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(resolve(projectRoot, 'src'), {
  recursive: true,
});

const originalContent = 'export const value = 1;\n';
const brokenContent = 'export const value: number = "broken";\n';

await writeFile(
  resolve(projectRoot, 'package.json'),
  `${JSON.stringify(
    {
      scripts: {
        typecheck: 'echo sandbox failure check && exit 1',
      },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

await writeFile(resolve(projectRoot, 'src/value.ts'), originalContent, 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'proposal-patch-sandbox-failure-test',
  planId: 'plan-patch-sandbox-failure-test',
  sessionId: 'session-patch-sandbox-failure-test',
  projectRoot,
  summary: 'Validate patch sandbox verification failure handling.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: brokenContent,
      reason: 'Introduce a failing patch for sandbox failure handling test.',
      changesSummary: ['Changes value file and expects verification to fail.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to low-impact non-sensitive files.',
      mitigation: 'Still require diff preview and user approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Intentional failing verify command for sandbox failure test.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const sandbox = new PatchSandbox({
  cleanup: false,
});

const result = await sandbox.verify({
  proposal,
  verifyCommands: proposal.verifyCommands,
  approvalState: 'approved',
});

assert(result.status === 'failed', `Expected sandbox verification to fail, got ${result.status}.`);

const workspace = required(result.workspace, 'Expected sandbox workspace to be created.');
const applyResult = required(result.applyResult, 'Expected sandbox patch apply result.');

assert(applyResult.status === 'applied', 'Expected sandbox patch apply before verify failure.');
assert(result.verifyRuns.length === 1, 'Expected one sandbox verify run.');
assert(result.verifyRuns[0]?.status === 'executed', 'Expected failing verify command to execute.');
assert(result.verifyRuns[0]?.exitCode === 1, 'Expected verify command to exit with 1.');
assert(
  result.verifyRuns[0]?.stdoutSummary.includes('sandbox failure check') === true,
  'Expected verify stdout summary to preserve failure output.',
);
assert(
  result.issues.some((issue) => issue.code === 'SANDBOX_VERIFY_FAILED'),
  'Expected SANDBOX_VERIFY_FAILED issue.',
);

const originalProjectContent = await readFile(resolve(projectRoot, 'src/value.ts'), 'utf8');
const sandboxProjectContent = await readFile(
  resolve(workspace.workspaceRoot, 'src/value.ts'),
  'utf8',
);

assert(
  originalProjectContent === originalContent,
  'Expected original project file to remain unchanged after sandbox failure.',
);

assert(
  sandboxProjectContent === brokenContent,
  'Expected sandbox workspace file to contain failed patch content.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch sandbox failure test completed',
      status: result.status,
      sandboxId: workspace.sandboxId,
      workspaceRoot: workspace.workspaceRoot,
      applyStatus: applyResult.status,
      verifyRuns: result.verifyRuns.map((run) => ({
        command: run.command,
        status: run.status,
        exitCode: run.exitCode,
        stdoutSummary: run.stdoutSummary,
        stderrSummary: run.stderrSummary,
      })),
      issues: result.issues,
      originalProjectContent,
      sandboxProjectContent,
    },
    null,
    2,
  ),
);
