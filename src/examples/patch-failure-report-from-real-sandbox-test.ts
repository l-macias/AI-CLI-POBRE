import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PatchSandbox } from '../sandbox/PatchSandbox.js';
import { PatchFailureReportBuilder } from '../patches/PatchFailureReport.js';
import { PatchRepairPromptBuilder } from '../patches/PatchRepairPromptBuilder.js';
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

const runtimeRoot = '.runtime/patch-failure-report-from-real-sandbox-test';
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
        typecheck: 'echo real sandbox repair check && exit 1',
      },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

await writeFile(resolve(projectRoot, 'src/value.ts'), originalContent, 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'proposal-real-sandbox-failure-report-test',
  planId: 'plan-real-sandbox-failure-report-test',
  sessionId: 'session-real-sandbox-failure-report-test',
  projectRoot,
  summary: 'Validate failure report from real sandbox result.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: brokenContent,
      reason: 'Introduce a failing patch for real sandbox failure report test.',
      changesSummary: ['Changes value file and expects sandbox verification to fail.'],
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
      reason: 'Intentional failing verify command for real sandbox failure report test.',
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

const sandboxResult = await sandbox.verify({
  proposal,
  verifyCommands: proposal.verifyCommands,
  approvalState: 'approved',
});

assert(sandboxResult.status === 'failed', 'Expected real sandbox result to fail.');

const applyResult = required(
  sandboxResult.applyResult,
  'Expected real sandbox apply result to exist.',
);

assert(applyResult.status === 'applied', 'Expected sandbox apply to happen before verify failure.');

const report = new PatchFailureReportBuilder().build({
  proposal,
  sandboxResult,
});

assert(report.status === 'failed', 'Expected report status failed.');
assert(report.applyStatus === 'applied', 'Expected report to preserve real apply status.');
assert(report.verifyFailures.length === 1, 'Expected one verify failure.');

const firstVerifyFailure = required(report.verifyFailures[0], 'Expected first verify failure.');

assert(
  firstVerifyFailure.stdoutSummary.includes('real sandbox repair check'),
  'Expected real sandbox verify stdout to be preserved.',
);

const prompt = new PatchRepairPromptBuilder().build({
  originalObjective: 'Fix value export safely after sandbox failure.',
  proposal,
  failureReport: report,
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(prompt.user.includes('Apply status: applied'), 'Expected prompt to include apply status.');
assert(
  prompt.user.includes('real sandbox repair check'),
  'Expected prompt to include real sandbox failure output.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch failure report from real sandbox test completed',
      sandboxStatus: sandboxResult.status,
      applyStatus: applyResult.status,
      report,
      prompt,
    },
    null,
    2,
  ),
);
